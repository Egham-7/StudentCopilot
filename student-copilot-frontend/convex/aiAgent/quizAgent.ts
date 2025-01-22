"use node";
import {
  Annotation,
  Command,
  END,
  MessagesAnnotation,
  StateGraph,
} from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { Quiz, shortAnswerSchema, quizeTypeSchema, QuizType, ShortAnswerQuiz } from "./types/quizAgent";
import { planQuizPrompt, genarateShortAnswerPrompt } from "./prompts/quizAgent";

type InputAnnotationState = typeof inputAnnotation.State;

const inputAnnotation = Annotation.Root({
  ...MessagesAnnotation.spec,
    // content
    Chunkcontent:Annotation<string>,
    // user prefference
    learningStyle: Annotation<string>,
    levelOfStudy: Annotation<"Bachelors" | "Associate" | "Masters" | "PhD">,
    course: Annotation<string>,

    //previous generated list of quizes
    prevQuiz :Annotation<Quiz>,

    //Quize Type
    plan:Annotation<QuizType>
});

const outputAnnotation = Annotation.Root({
  quize: Annotation<Quiz>,
});



export async function planQuiz(
    state: InputAnnotationState,
  ): Promise<Command> {
    const { learningStyle, levelOfStudy, course, prevQuiz } = state;
  
    const llm = new ChatOpenAI({
      model: "gpt-4-0613",
    });
  
    const structuredModel = llm.withStructuredOutput(quizeTypeSchema);
    const chain = planQuizPrompt.pipe(structuredModel);
  
    const result = await chain.invoke({
      learningStyle,
      levelOfStudy,
      course,
      prevQuiz,
    });
  
    const parsedQuiz = await quizeTypeSchema.safeParseAsync(result);
  
    if (!parsedQuiz.success) {
      throw new Error(
        `Failed to generate quiz: ${parsedQuiz.error}`
      );
    }
  
    // Return a Command to update the state
    return new Command({
      update: {
        plan: parsedQuiz.data,
      },
    });
  }

  
  export async function genShortAnswerQuiz(
    state: InputAnnotationState,
): Promise<ShortAnswerQuiz> {
    const chunkContent = state.Chunkcontent;
    const plan = state.messages[state.messages.length - 1];

    const llm = new ChatOpenAI({
        model: "gpt-4-0613",
    });

    const structuredModel = llm.withStructuredOutput(shortAnswerSchema);
    const chain =   genarateShortAnswerPrompt.pipe(structuredModel);

    const result = await chain.invoke({
        chunkContent,
        plan
    });

    const parsedQuiz = await shortAnswerSchema.safeParseAsync(result);

    if (!parsedQuiz.success) {
        throw new Error(
            `Failed to generate quiz: ${parsedQuiz.error}`
        );
    }

    return {
        question: parsedQuiz.data.question,
        difficulty: parsedQuiz.data.difficulty
    };
}



export async function determineQuizType(state: InputAnnotationState): Promise<string> {
    const { plan } = state;
    // Logic to decide the next node based on the plan
    if (plan.plan=="Short Answer") {
      return "generate_quizes";
    }
    // Add more conditions as needed
    return END;
  }
  


export const graph = new StateGraph({
  input: inputAnnotation,
  output: outputAnnotation,
})
  .addNode("plan", planQuiz)
  .addNode("generate_quizes", genShortAnswerQuiz)
  .addNode("quiz_type", determineQuizType)
  .addEdge("__start__", "plan")
  .addConditionalEdges("plan", "quiz_type")
  .addEdge("generate_quizes", END); 

