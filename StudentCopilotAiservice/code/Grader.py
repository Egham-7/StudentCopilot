import os
from langchain_groq import ChatGroq
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.exceptions import OutputParserException

class Grader:
    def __init__(self):
        self.llm = ChatGroq(temperature=0, groq_api_key=os.getenv("GROQ_API_KEY"), model_name="llama-3.1-70b-versatile")

    def grade(self, result, original_prompt):
        prompt = PromptTemplate.from_template(
            """
            ###TASK:
            Evaluate the next provided result: {result} based on the following original prompt: {original_prompt}:
            
            ###CRITERIA FOR GRADING:
            1. Adherence to Prompt: How well the result follows the instructions and requirements given in the original prompt.
            2. Relevance: How relevant the result is to the context or topic specified in the original prompt.
            3. Clarity: The clarity and readability of the result.
            4. Conciseness: Whether the result is succinct and avoids unnecessary information.
            5. Accuracy: The correctness and precision of the information (if applicable).
            
            ###INSTRUCTION:
            Grade the provided result on a scale from 0 to 100:
                    100: Perfect—fully meets all criteria and the original prompt's requirements.
                    0: Completely unsatisfactory—fails to meet the prompt’s requirements.
            ###OUTPUT:
            Return the grade as a single number (0-100) in JSON format, with no additional text, explanation, or commentary. Use the following format:
            
                "grade": <number>
            
            """
        )
        
        chain_extract = prompt | self.llm
        try:
            res = chain_extract.invoke(input={"result": result, "original_prompt": original_prompt})
            print("Raw response content:", res.content)  # Log the raw response
            if res.content.startswith("{") and res.content.endswith("}"):
                json_parser = JsonOutputParser()
                res = json_parser.parse(res.content)
            else:
                raise ValueError("Response is not in valid JSON format.")
        except OutputParserException as e:
            print("Parsing error:", str(e))  # Log parsing errors
            raise
        except Exception as e:
            print("General error:", str(e))  # Catch other errors (e.g., network issues)
            raise
        return res


    def grade1(self, result, original_text):
        prompt = PromptTemplate.from_template(
            """
            ###TASK:
            Evaluate the next provided result: {result} based on the following original Text: {original_text}
            
            ###CRITERIA FOR GRADING:
            1. Clarity: Asses if the orginal text is clear and concise, Evaluate if the notes are easy to read and understand, effectively summarizing the main points.
            2. Comprehensiveness : Determine if the original text covers all essential aspects of the topic,Check if the notes capture all key ideas and significant details, noting any critical points that may be missing. 
            3. Structure and Organization: Analyze the organization and logical flow of the original text, Review if the notes reflect the structure of the original text, with a clear hierarchy of information (e.g., headings, bullet points). 
            4. Relevance: Ensure the original text stays on topic and focuses on the main subject, Confirm if the notes remain relevant to the main themes of the original text, avoiding unnecessary details.
            5. Accuracy: Verify the accuracy and credibility of the information in the original text, Assess if the notes accurately represent the information from the original text, identifying any misinterpretations or factual errors. 
            
            ###INSTRUCTION:
            Grade the provided result on a scale from 0 to 100:
                    Here's a prompt you can use directly for grading notes based on the original text:

Grading Criteria for Notes vs. Original Text

Evaluate the effectiveness of the notes compared to the original text using the following criteria:

    Clarity (20 points)
        Assess if the original text is clear and concise.
        Evaluate if the notes are easy to read and understand, effectively summarizing the main points.

    Comprehensiveness (20 points)
        Determine if the original text covers all essential aspects of the topic.
        Check if the notes capture all key ideas and significant details, noting any critical points that may be missing.

    Structure and Organization (20 points)
        Analyze the organization and logical flow of the original text.
        Review if the notes reflect the structure of the original text, with a clear hierarchy of information (e.g., headings, bullet points).

    Relevance (20 points)
        Ensure the original text stays on topic and focuses on the main subject.
        Confirm if the notes remain relevant to the main themes of the original text, avoiding unnecessary details.

    Accuracy (20 points)
        Verify the accuracy and credibility of the information in the original text.
        Assess if the notes accurately represent the information from the original text, identifying any misinterpretations or factual errors.

Total: 100 points

Scoring Guidelines:
    90-100: Excellent – Notes are highly effective and reflect a strong understanding of the original text.
    70-89: Good – Notes adequately summarize the text but may lack some detail or clarity.
    50-69: Fair – Notes capture some key ideas but are missing significant elements or contain inaccuracies.
    Below 50: Poor – Notes do not effectively summarize the text and lack coherence, relevance, or accuracy.
###OUTPUT:
        Return the grade as a single number (0-100) in JSON format, with no additional text, explanation, or commentary. Use the following format:
            
            "grade": <number>
            
            """
        )
        
        chain_extract = prompt | self.llm
        try:
            res = chain_extract.invoke(input={"result": result, "original_text":original_text})
            print("Raw response content:", res.content)  # Log the raw response
            if res.content.startswith("{") and res.content.endswith("}"):
                json_parser = JsonOutputParser()
                res = json_parser.parse(res.content)
            else:
                raise ValueError("Response is not in valid JSON format.")
        except OutputParserException as e:
            print("Parsing error:", str(e))  # Log parsing errors
            raise
        except Exception as e:
            print("General error:", str(e))  # Catch other errors (e.g., network issues)
            raise
        return res
