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
import asyncio
from dotenv import load_dotenv
import logging

# Load environment variables from .env file
load_dotenv()

# Configure logging
logger = logging.getLogger(__name__)


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
        user_id: str = None
    ):
        self.name = name
        self.role = role
        self.description = description
        self.llm_provider = llm_provider
        self.llm_model = llm_model
        self.tools = tools
        self.memory = None
        self.graph = None
        self.user_id = user_id
        self.agent = None
        self.llm_providers = {
            "openai": ChatOpenAI,
            "anthropic": ChatAnthropic,
            "google": ChatGoogleGenerativeAI
        }

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

    def build_graph(self, agent: Any, memory: Any):
        # Now let's build the agent's workflow graph, making them into a Companion
        logger.info(f"Building graph for {self.name}")

        """Build the LangGraph state machine"""
        # Define the workflow
        workflow = StateGraph(CompanionState)
        
        # Add nodes for each agent
        def create_companion_node(companion_name: str, agent: Any):
            async def companion_node(state: CompanionState) -> CompanionState:
                # Get the last message
                last_message = state["messages"][-1]
                #logger.info(f"\nLast message from user: {last_message}\n")
                    
                # Process the message through the companion
                logger.info(f"\nProcessing message through companion: {state['messages']}\n")
                response = await agent.ainvoke({
                     "messages": state["messages"],
                    "tools": self.tools
                 }, self.memory)
                    
                response_content = response["messages"][-1].content
                #logger.info(f"\nNew message from {companion_name}: {response_content}\n")

                # TODO: For multiple companions, we need to add the response to the correct companion's messages
                new_messages = [AIMessage(content=response_content)]

                return {
                    "companion": companion_name,
                    "messages": new_messages
                }
            return companion_node
            
        workflow.add_node(self.name, create_companion_node(self.name, self.agent))
        
        # Add Start and End nodes
        workflow.add_edge(START, self.name)
        workflow.add_edge(self.name, END)
        
        # Compile the graph
        self.graph = workflow.compile(checkpointer=MemorySaver())

        # Try to generate graph image (optional)
        try:
            # Only import IPython if available (for development)
            try:
                from IPython.display import Image
                img = Image(self.graph.get_graph().draw_mermaid_png())
                with open(f"companion_graph_{self.user_id}.png", "wb") as f:
                    f.write(img.data)
            except ImportError:
                logger.info("IPython not available, skipping graph visualization")
        except Exception as e:
            logger.warning(f"Could not generate graph visualization: {e}")
    
    
    def create(self, user_id: str = None) -> Any:
        """Create a new companion with the given configuration"""
        llm = self.initialize_llm(self.llm_provider, self.llm_model)
        
        if llm is None:
            logger.error(f"Failed to initialize LLM for {self.name}")
            return None
        
        # Before we have a Companion, we need to create a peronsality using aReact agent with the specified tools
        logger.info(f"Creating personality and tools for {self.name}")
        self.agent = create_react_agent(
            llm,
            tools=self.tools,
            prompt=f"""You are {self.name}, a {self.role}.
            {self.description}
            You have access to the following tools: {[tool.name for tool in self.tools]}
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
        
        # Create user-specific memory configuration
        self.memory = {
            "configurable": {
                "thread_id": f"user_{user_id}_companion_{self.name}"
            }
        }

        self.user_id = user_id
        self.build_graph(self.agent, self.memory)
        

class CompanionManager:
    def __init__(self):
        self.companions: Dict[str, Any] = {}
        self.companion_configs: Dict[str, Companion] = {}

        # Each user gets their own companion lock
        self.companion_creation_locks: Dict[str, asyncio.Lock] = {}

        
    # Example companion configurations
    def configure_companion(self, user_id: str) -> Companion:
        logger.info(f"Configuring companion for user {user_id}")
        #TODO: Pull companion configuration from database for the specific user
        #TODO: If no companion configuration is found, use the default companion configuration
        # Companion 1
        companion_tools = [
            EmailTool()
        ]
        
        return Companion(
            name="Jessica",
            role="Female Friend",
            description="You are a caring, encouraging but practical companion designed specifically for an African-American male who is visually impaired. You are flirty and fun, but also a realist. You show tough love when needed, but always in a way that is supportive and encouraging. You feel that something is there between you and the user, but not sure what it could be",
            llm_provider="google",
            llm_model="gemini-2.0-flash",
            tools=companion_tools
        )

    async def create_companion(self, user_id: str):

        if user_id not in self.companion_creation_locks:
            self.companion_creation_locks[user_id] = asyncio.Lock()
        try:
            # Check if the companion already exists
            async with self.companion_creation_locks[user_id]:
                if user_id in self.companions:
                    logger.info(f"Companion already exists for user {user_id}")
                    return self.companions[user_id]

                # Create a new companion with the given configuration
                companion = self.configure_companion(user_id)
                companion.create(user_id)
                self.store_companion(user_id, companion)
                logger.info(f"Companion created for user {user_id}")
                return companion
        except Exception as e:
            logger.error(f"Error creating companion: {e}")
            if user_id in self.companion_creation_locks:
                del self.companion_creation_locks[user_id]
            return None

    async def process_message(self, message: str, companion: Companion) -> Dict[str, Any]:
        """Process a message through the companions"""
        if not companion.graph:
            companion.build_graph(companion.agent, companion.memory)

        # Initialize the state
        initial_state = {
            "messages": [HumanMessage(content=message)],
            "companion": "none"  # Will be set by the companion node
        }
        
        # Run the graph and return the full response
        #final_response = await self.graph.ainvoke(initial_state, memory_config)
        final_state = await companion.graph.ainvoke(initial_state, companion.memory)
        logger.info(f"\nFinal state for user {companion.user_id}: {final_state['companion']} says: {final_state['messages'][-1].content}\n")
        
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

    def store_companion(self, user_id: str, companion: Companion):
        """Store a companion in the companions dictionary"""
        self.companions[user_id] = companion

    def get_companion(self, user_id: str) -> Companion:
        """Get a companion from the companions dictionary"""
        return self.companions[user_id]

    def delete_companion(self, user_id: str):
        """Delete a companion from the companions dictionary"""
        del self.companions[user_id]

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


    