"use node";
import {
  Annotation,
  Command,
  END,
  MessagesAnnotation,
  StateGraph,
} from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { Quiz, shortAnswerSchema, quizeTypeSchema, QuizType, ShortAnswerQuiz, MultiChoiceQuiz, multipleChoiceQSchema,trueFalseSchema, TrueFalseQuize } from "./types/quizAgent";
import { planQuizPrompt, genarateShortAnswerPrompt, generateMultipleChoicePrompt, generateTrueFalsePrompt } from "./prompts/quizAgent";

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
    const { learningStyle, levelOfStudy, course, prevQuiz, Chunkcontent } = state;
  
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
      Chunkcontent
    });
  
    const parsedQuiz = await quizeTypeSchema.safeParseAsync(result);
  
    if (!parsedQuiz.success) {
      throw new Error(
        `Failed to generate quiz: ${parsedQuiz.error}`
      );
    }
    console.log("PLAN",parsedQuiz);

    // Return a Command to update the state
    return new Command({
        update: {
          plan: {
            types: parsedQuiz.data.types,
            plan: parsedQuiz.data.plan
          }
        }
    });
  }

  
  export async function genShortAnswerQuiz(
    state: InputAnnotationState,
): Promise<ShortAnswerQuiz> {
    const chunkContent = state.Chunkcontent;
    const plan = state.plan;

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
    console.log("QUIZ",parsedQuiz);
    return {
        question: parsedQuiz.data.question,
        difficulty: parsedQuiz.data.difficulty
    };
}

export async function genMultipleChoiceQuiz(
    state: InputAnnotationState,
): Promise<MultiChoiceQuiz> {
    const chunkContent = state.Chunkcontent;
    const plan = state.plan;

    const llm = new ChatOpenAI({
        model: "gpt-4-0613",
    });

    const structuredModel = llm.withStructuredOutput(multipleChoiceQSchema);
    const chain = generateMultipleChoicePrompt.pipe(structuredModel);

    const result = await chain.invoke({
        chunkContent,
        plan
    });

    const parsedQuiz = await multipleChoiceQSchema.safeParseAsync(result);

    if (!parsedQuiz.success) {
        throw new Error(
            `Failed to generate quiz: ${parsedQuiz.error}`
        );
    }

    console.log("QUIZ", parsedQuiz.data.options);
    return {
        question: parsedQuiz.data.question,
        difficulty: parsedQuiz.data.difficulty,
        options: parsedQuiz.data.options
    };
}


export async function genTrueFalseQuiz(
    state: InputAnnotationState,
): Promise<TrueFalseQuize> {
    const chunkContent = state.Chunkcontent;
    const plan = state.plan;

    const llm = new ChatOpenAI({
        model: "gpt-4-0613",
    });

    const structuredModel = llm.withStructuredOutput(trueFalseSchema);
    const chain = generateTrueFalsePrompt.pipe(structuredModel);

    const result = await chain.invoke({
        chunkContent,
        plan
    });

    const parsedQuiz = await trueFalseSchema.safeParseAsync(result);

    if (!parsedQuiz.success) {
        throw new Error(
            `Failed to generate quiz: ${parsedQuiz.error}`
        );
    }

    console.log("QUIZ", parsedQuiz.data);
    return {
        question: parsedQuiz.data.question,
        difficulty: parsedQuiz.data.difficulty,
        statement: parsedQuiz.data.statement,
        correctAnswer: parsedQuiz.data.correctAnswer,
        explanation: parsedQuiz.data.explanation
    };
}




export async function determineQuizType(state: InputAnnotationState): Promise<string> {
    const { plan } = state;

    // Validate `plan` and `plan.types`
    if (!plan || !plan.types) {
        console.error("Invalid or missing `plan.types`:", plan);
        throw new Error("Invalid state: `plan.types` is undefined or null.");
    }

    // Logic to decide the next node based on the plan
    /*
    if (plan.types === "Short Answer") {
        return "gen_short_ans";
    }
    if (plan.types === "Multiple Choice") {
        return "gen_multi_choice";
    }
        */
    if (plan.types === "True or False") {
        return "gen_true_false";
    }

    // Log unknown type and return a fallback
    console.warn("Unknown `plan.types`: ", plan.types);
    return "default_node"; // Replace with a valid fallback if needed
}



export const quizGraph = new StateGraph({
input: inputAnnotation,
output: outputAnnotation,
})
.addNode("planQuiz", planQuiz)  
.addNode("gen_short_ans", genShortAnswerQuiz)
.addNode("gen_multi_choice", genMultipleChoiceQuiz)
.addNode("gen_true_false", genTrueFalseQuiz)
.addEdge("__start__", "planQuiz") 
.addConditionalEdges("planQuiz", determineQuizType)
.addEdge("gen_short_ans", END)
.addEdge("gen_multi_choice", END)
.addEdge("gen_true_false",END);


  


