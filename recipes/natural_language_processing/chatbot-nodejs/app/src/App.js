import Chatbot from 'react-chatbotify';
import { RunnableWithMessageHistory } from '@langchain/core/runnables';
import { ChatPromptTemplate, MessagesPlaceholder } from '@langchain/core/prompts';
import { ChatMessageHistory } from 'langchain/stores/message/in_memory';
import { ChatOpenAI } from '@langchain/openai';


const model_service = process.env.MODEL_ENDPOINT ||
                      'http://localhost:8001';


function App() {

  /////////////////////////////////////
  // Function to check if/which LLM is available
  async function checkingModelService() {
    let server;
    const startTime = new Date();
    while (true) {
      let result = await fetch(`${model_service}/v1/models`);
      if (result.status === 200) {
        server = 'Llamacpp_Python';
        break;
      };
    };

    const endTime = new Date();
    return { details: `${server} Model Service Available\n` + 
                      `${(endTime.getSeconds() - startTime.getSeconds()) } seconds`,
             server: server
           };
  };

  /////////////////////////////////////
  // Functions to interact with the LLM

  let chainWithHistory;

  function createLLM(server) {
    if (server === 'Llamacpp_Python') {  
      const llm = new ChatOpenAI(
        { openAIApiKey: 'EMPTY' },
        { baseURL: `${model_service}/v1` }
      );
      return llm;
    } else {
      throw new Error('Unknown llm');
    };
  };

  function createChain(server) {
    const prompt = ChatPromptTemplate.fromMessages([
      [ 'system',
        'You are a helpful chat agent. ' +
        'Answer any questions asked but if you are not certain of the answer say so. ' +
        'Answer only with plain answer do not include any annotations or qualifiers.'
      ],
      new MessagesPlaceholder('history'),
      [ 'human', '{input}' ]
    ]);

    const llm = createLLM(server);
    const chatMessageHistory = new ChatMessageHistory();
    const chain = prompt.pipe(llm);

    chainWithHistory = new RunnableWithMessageHistory({
      runnable: chain,
      getMessageHistory: (_sessionId) => chatMessageHistory,
      inputMessagesKey: 'input',
      historyMessagesKey: 'history',
    });
  };

  async function answerQuestion(question) {
    const result = await chainWithHistory.invoke(
      { input: question, },
      { configurable: { sessionId: 'unused' }}
    );
    return result.content;
  };

  /////////////////////////////////////
  // chatbotify flow definition
  const flow = {
    start: {
      message: 'Checking Model Service Availability...',
      transition: {duration: 0},
      chatDisabled: true,
      path: 'confirm_model',
    },
    confirm_model: {
      message: async (parms) => { 
        const result = await checkingModelService();
        createChain(result.server);
        return result.details;
      },  
    transition: {duration: 0},      
    chatDisabled: true,
      path: 'start_chat', 
    },
    start_chat: {
      message: 'How can I help you ?',
      path: 'get_question',
    },
    get_question: {
      message: async (params) => {
        return await answerQuestion(params.userInput);
      },
      path: 'get_question'
    },
  };

  /////////////////////////////////////
  // react components to be displayed
  return (
    <Chatbot options={{theme: {embedded: true, showFooter: false},
                       header: {title: 'chatbot - nodejs'},
                       chatHistory: {storageKey: 'history'}}} flow={flow}/>
  );
};

export default App;
