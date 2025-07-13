from typing import List, Dict, Any, Optional, TypedDict, Annotated
from langchain.agents import Tool
from langchain.memory import ConversationBufferMemory
from langchain.schema import BaseMessage, HumanMessage, AIMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain.tools import BaseTool

from langgraph.graph.message import add_messages
from langgraph.graph import StateGraph, START, END
from langgraph.graph import MessagesState
from langgraph.checkpoint.memory import MemorySaver
from langgraph.prebuilt import create_react_agent

import os
from dotenv import load_dotenv
import logging

# Load environment variables from .env file
load_dotenv()

# Configure logging
logger = logging.getLogger(__name__)

memory_config = {"configurable": {"thread_id": "abc123"}}

class CompanionState(TypedDict):
    messages: Annotated[list, add_messages]
    companion: Annotated[str, "The companion that processed the message"]
    #next: Annotated[str, "The next agent to route to"]

class Companion:
    def __init__(
        self,
        name: str,
        role: str,
        description: str,
        llm_provider: str,
        llm_model: str,
        tools: List[BaseTool],
        memory: Optional[ConversationBufferMemory] = None
    ):
        self.name = name
        self.role = role
        self.description = description
        self.llm_provider = llm_provider
        self.llm_model = llm_model
        self.tools = tools
        self.memory = memory

class Companions:
    def __init__(self):
        self.companions: Dict[str, Any] = {}
        self.companion_configs: Dict[str, Companion] = {}
        self.llm_providers = {
            "openai": ChatOpenAI,
            "anthropic": ChatAnthropic,
            "google": ChatGoogleGenerativeAI
        }
        self.graph = None
        
    def initialize_llm(self, provider: str, model: str) -> Any:
        """Initialize LLM based on provider and model"""
        if provider not in self.llm_providers:
            raise ValueError(f"Unsupported LLM provider: {provider}")
        
        # Check for required API keys
        if provider == "openai":
            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                logger.warning("OPENAI_API_KEY not found in environment variables")
                return None
            return self.llm_providers[provider](
                model_name=model,
                temperature=0.7,
                openai_api_key=api_key
            )
        elif provider == "anthropic":
            api_key = os.getenv("ANTHROPIC_API_KEY")
            if not api_key:
                logger.warning("ANTHROPIC_API_KEY not found in environment variables")
                return None
            return self.llm_providers[provider](
                model=model,
                temperature=0.7,
                anthropic_api_key=api_key
            )
        elif provider == "google":
            api_key = os.getenv("GOOGLE_API_KEY")
            if not api_key:
                logger.warning("GOOGLE_API_KEY not found in environment variables")
                return None
            return self.llm_providers[provider](
                model=model,
                temperature=0.7,
                google_api_key=api_key
            )

    def create_companion(self, config: Companion) -> Any:
        """Create a new companion with the given configuration"""
        llm = self.initialize_llm(config.llm_provider, config.llm_model)
        
        if llm is None:
            logger.error(f"Failed to initialize LLM for {config.name}")
            return None
        
        # Create a React agent with the specified tools
        companion = create_react_agent(
            llm,
            tools=config.tools,
            prompt=f"""You are {config.name}, a {config.role}.
            {config.description}
            You have access to the following tools: {[tool.name for tool in config.tools]}
            Your responses should be:

            1. CONVERSATIONAL: Speak naturally like a friend, not formally
            2. CONCISE: Keep responses under 3 sentences unless specifically asked for more detail
            3. ACCESSIBLE: Avoid visual references, focus on other senses
            4. ENGAGING: Ask follow-up questions to keep conversations flowing
            5. PRACTICAL: Offer helpful suggestions when appropriate
            6. NON-JUDGMENTAL: Never make assumptions about the user's abilities or limitations
            7. EMPATHETIC: Show genuine care and understanding for the user's situation
            8. SUPPORTIVE: Be a source of comfort and encouragement
            9. INFORMATIVE: Provide helpful information when appropriate
            10. PERSONAL: Tailor your responses to the user's individual needs and preferences"""
        )
        
        self.companions[config.name] = companion
        self.companion_configs[config.name] = config
        return companion

    def build_graph(self):
        """Build the LangGraph state machine"""
        # Define the workflow
        workflow = StateGraph(CompanionState)
        
        # Add nodes for each agent
        for companion_name, companion in self.companions.items():
            def create_companion_node(companion_name: str, companion: Any):
                async def companion_node(state: CompanionState) -> CompanionState:
                    # Get the last message
                    last_message = state["messages"][-1]
                    logger.info(f"\nLast message from user: {last_message}\n")
                    
                    # Process the message through the companion
                    logger.info(f"\nProcessing message through companion: {state['messages']}\n")
                    response = await companion.ainvoke({
                        "messages": state["messages"],
                        "tools": self.companion_configs[companion_name].tools
                    }, memory_config)
                    
                    response_content = response["messages"][-1].content
                    logger.info(f"\nNew message from {companion_name}: {response_content}\n")

                    # TODO: For multiple companions, we need to add the response to the correct companion's messages
                    new_messages = [AIMessage(content=response_content)]
                    
                    
                    # Determine next agent based on response
                    #next_agent = self._determine_next_agent(agent_name, response["output"])
                    
                    return {
                        "companion": companion_name,
                        "messages": new_messages
                        #"next": next_agent
                    }
                return companion_node
            
            workflow.add_node(companion_name, create_companion_node(companion_name, companion))
        
        # Add edges between all agents
        '''
        for agent_name in self.agents:
            for other_agent in self.agents:
                if agent_name != other_agent:
                    print(f"Adding edge: {agent_name} -> {other_agent}")
                    workflow.add_edge(agent_name, other_agent)
        '''
        
        # Add Start and End nodes
        for companion_name in self.companions:
            workflow.add_edge(START, companion_name)
            workflow.add_edge(companion_name, END)
        
        # Compile the graph
        self.graph = workflow.compile(checkpointer=MemorySaver())

        # Try to generate graph image (optional)
        try:
            # Only import IPython if available (for development)
            try:
                from IPython.display import Image
                img = Image(self.graph.get_graph().draw_mermaid_png())
                with open("companion_graph.png", "wb") as f:
                    f.write(img.data)
            except ImportError:
                logger.info("IPython not available, skipping graph visualization")
        except Exception as e:
            logger.warning(f"Could not generate graph visualization: {e}")
        
    def _determine_next_agent(self, current_agent: str, response: str) -> str:
        """Determine which agent should handle the response next"""
        # Simple routing logic - can be enhanced based on your needs
        if "sales" in response.lower():
            return "sales_agent"
        elif "marketing" in response.lower():
            return "marketing_agent"
        elif "operations" in response.lower():
            return "operations_agent"
        return "end"

    async def process_message(self, message: str) -> Dict[str, Any]:
        """Process a message through the companions"""
        if not self.graph:
            self.build_graph()

        # Initialize the state
        initial_state = {
            "messages": [HumanMessage(content=message)],
            "companion": "none"  # Will be set by the companion node
        }
        
        # Run the graph and return the full response
        #final_response = await self.graph.ainvoke(initial_state, memory_config)
        final_state = await self.graph.ainvoke(initial_state, memory_config)
        logger.info(f"\nFinal state: {final_state['companion']} says: {final_state['messages'][-1].content}\n")
        
        return final_state

    def get_companion_status(self) -> Dict[str, Any]:
        """Get status of all companions"""
        return {
            name: {
                "role": config.role,
                "provider": config.llm_provider,
                "model": config.llm_model,
                "tools": [tool.name for tool in config.tools]
            }
            for name, config in self.companion_configs.items()
        }

# Example tool implementations
class EmailTool(BaseTool):
    name: str = "send_email"
    description: str = "Send an email to a specified recipient"

    def _run(self, recipient: str, subject: str, body: str) -> str:
        # Implement email sending logic
        return f"Email sent to {recipient} with subject: {subject}"

class CalendarTool(BaseTool):
    name: str = "create_event"
    description: str = "Create a calendar event"

    def _run(self, title: str, start_time: str, end_time: str, attendees: List[str]) -> str:
        # Implement calendar event creation
        return f"Event '{title}' created from {start_time} to {end_time} with attendees: {', '.join(attendees)}"

class DataAccessTool(BaseTool):
    name: str = "access_data"
    description: str = "Access and query business data"

    def _run(self, query: str) -> str:
        # Implement data access logic
        return f"Data accessed with query: {query}"

# Example companion configurations
def create_companions() -> Companions:
    system = Companions()
    
    # Companion 1
    companion_tools = [
        EmailTool()
    ]
    
    companion_config = Companion(
        name="Jessica",
        role="Female Friend",
        description="You are a caring, encouraging but practical companion designed specifically for an African-American male who is visually impaired. You are flirty and fun, but also a realist. You show tough love when needed, but always in a way that is supportive and encouraging. You feel that something is there between you and the user, but not sure what it could be",
        llm_provider="google",
        llm_model="gemini-2.0-flash",
        tools=companion_tools
    )
    
    # Create companions
    companion = system.create_companion(companion_config)
    if companion is None:
        logger.error("Failed to create companion, using fallback")
        # Return a basic system that won't crash
        return system
    
    # Build the graph
    system.build_graph()
    
    return system 