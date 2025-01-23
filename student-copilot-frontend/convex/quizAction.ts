"use node";
import {quizGraph} from "./aiAgent/quizAgent";

/****************/
const compiledQuizGraph = quizGraph.compile();
const c = `
Time Complexity:

Represents how the execution time of an algorithm increases relative to the size of the input.
For example, an algorithm with a complexity of 
𝑂(𝑛)
O(n) will take twice as long if the input size doubles.
Space Complexity:

Refers to the amount of memory an algorithm uses as the input size grows.
Input Size (
𝑛

n):

The size of the data the algorithm processes. It can represent the number of elements in an array, the length of a string, or any measurable input characteristic.
`;


const processingResult = await compiledQuizGraph.invoke(
  {

    Chunkcontent: c,
    learningStyle: "analytical",
    levelOfStudy: "Bachelors",
    course: "Computer Science",
  },
);

