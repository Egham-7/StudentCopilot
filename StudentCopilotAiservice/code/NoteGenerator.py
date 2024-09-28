import os
import json
from langchain_core.prompts import PromptTemplate
#from langchain_community.llms import ChatOpenAI
from langchain_openai import ChatOpenAI
from langchain.chains import LLMChain
import openai        

class GenerateNote:
    def __init__(self):
        # Initialize the LLM model
        self.llm = ChatOpenAI(model="gpt-4",
                            openai_api_key=os.getenv("OPENAI_API_KEY"))
        '''
        self.llm = ChatOpenAI(
            model="gpt-4",
            #temperature=0.3,
            #openai_api_key=os.getenv("OPENAI_API_KEY"),
        )
        '''
        self.model="gpt-4-32k"
        self.api_key=os.getenv("OPNEAI_API_KEY")
    
    def generate_note_first(self, learningStyle, lecture_text, levelOfStudy, course, notesStyle):
        # Create a prompt template for the first part of the lecture
        prompt_template = PromptTemplate(
            input_variables=["lecture_text", "learningStyle", "levelOfStudy", "course", "notesStyle"],
            template="""
            {lecture_text}

            ### INSTRUCTIONS:
            You are an expert note-taker and summarizer with a keen ability to distill complex information into clear, concise, and well-structured notes. Tailor your notes to the following user preferences:
            - Note-taking style: {notesStyle}
            - Learning style: {learningStyle}
            - Level of study: {levelOfStudy}
            - Course: {course}

            Your task is to:
            1. Analyze the provided lecture text thoroughly.
            2. Create a comprehensive summary in Markdown format, focusing on the key concepts and important points presented in the first part of the lecture.
            3. Use appropriate Markdown syntax for headings, subheadings, lists, and emphasis.
            4. Highlight key definitions, concepts, and significant takeaways.
            5. Organize the information logically and hierarchically to facilitate understanding.
            6. Include any relevant examples or case studies mentioned.
            7. If applicable, add bullet points for easy readability.
            8. Ensure the notes are concise yet informative, tailored to the user's level of study.
            9. Use code blocks for any multiline code content.
            10. Use Markdown math syntax that is compatible with KaTeX for any math formulas and equations.
            11. End with a brief "Key Takeaways" section summarizing the main points covered.
            12. For visual learners, suggest diagrams or visual aids where applicable.
            13. For auditory learners, emphasize key phrases or mnemonics that could aid memory retention.
            14. For kinesthetic learners, propose practical applications or hands-on activities related to the content.
            15. For analytical learners, include logical breakdowns and connections between concepts.

            Produce notes that would be valuable for review and quick reference, tailored to the user's specific needs and the course content. If the lecture text appears to be cut off mid-sentence or mid-thought, please use your best judgment to infer the intended meaning and complete the idea logically. Do not leave any sentences or thoughts unfinished in your summary.

            Return them in JSON format containing the following key: "notes".

            Ensure the response contains only the JSON object with the required key: "notes".
            """
        )

        # Prepare the input data for the prompt
        prompt_input = {
            "lecture_text": lecture_text,
            "learningStyle": learningStyle,
            "levelOfStudy": levelOfStudy,
            "course": course,
            "notesStyle": notesStyle,
        }

        # Set up the chain with the prompt template and the LLM
        llm_chain = LLMChain(
            llm=self.llm,
            prompt=prompt_template,
            output_key="notes"
        )

        # Run the chain
        result = llm_chain.run(prompt_input)

        print("Raw response content:", result)  # Log the raw response

        # Parse the result using the json module
        try:
            parsed_output = json.loads(result)
        except json.JSONDecodeError as e:
            print(f"Error parsing JSON output: {e}")
            raise

        return parsed_output if "notes" in parsed_output else {"notes": []}
    '''''''''''   
    def generate_note_first(self, learningStyle, lecture_text, levelOfStudy, course, notesStyle):
        prompt = f"""
        {lecture_text}

        ### INSTRUCTIONS:
        You are an expert note-taker and summarizer with a keen ability to distill complex information into clear, concise, and well-structured notes. Tailor your notes to the following user preferences:
        - Note-taking style: {notesStyle}
        - Learning style: {learningStyle}
        - Level of study: {levelOfStudy}
        - Course: {course}

        Your task is to:
        1. Analyze the provided lecture text thoroughly.
        2. Create a comprehensive summary in Markdown format, focusing on the key concepts and important points presented in the first part of the lecture.
        3. Use appropriate Markdown syntax for headings, subheadings, lists, and emphasis.
        4. Highlight key definitions, concepts, and significant takeaways.
        5. Organize the information logically and hierarchically to facilitate understanding.
        6. Include any relevant examples or case studies mentioned.
        7. If applicable, add bullet points for easy readability.
        8. Ensure the notes are concise yet informative, tailored to the user's level of study.
        9. Use code blocks for any multiline code content.
        10. Use Markdown math syntax that is compatible with KaTeX for any math formulas and equations.
        11. End with a brief "Key Takeaways" section summarizing the main points covered.
        12. For visual learners, suggest diagrams or visual aids where applicable.
        13. For auditory learners, emphasize key phrases or mnemonics that could aid memory retention.
        14. For kinesthetic learners, propose practical applications or hands-on activities related to the content.
        15. For analytical learners, include logical breakdowns and connections between concepts.

        Produce notes that would be valuable for review and quick reference, tailored to the user's specific needs and the course content. If the lecture text appears to be cut off mid-sentence or mid-thought, please use your best judgment to infer the intended meaning and complete the idea logically. Do not leave any sentences or thoughts unfinished in your summary.

        Return them in JSON format containing the following key: "notes".

        Ensure the response contains only the JSON object with the required key: "notes".
        """

        response = openai.ChatCompletion.create(
            model=self.model,
            messages=[
                {"role": "system", "content": "You are an expert note-taker."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3
        )

        # Get the JSON response with the "notes" key
        return response.choices[0].message['content']
    '''
    def generate_note_next(self, learningStyle, lecture_text, levelOfStudy, course, notesStyle):
        # Create a prompt template for the next part of the lecture
        prompt_template = PromptTemplate(
            input_variables=["lecture_text", "learningStyle", "levelOfStudy", "course", "notesStyle"],
            template="""
            {lecture_text}

            ### INSTRUCTIONS:
            This is the next part of the lecture. Follow the same guidelines as before to generate notes.
            - Note-taking style: {notesStyle}
            - Learning style: {learningStyle}
            - Level of study: {levelOfStudy}
            - Course: {course}

            1. Create a summary in Markdown format, focusing on key points in the lecture.
            2. Highlight key definitions, concepts, and significant takeaways.
            3. Use headings, bullet points, and lists to structure the notes.
            4. Use Markdown-compatible math syntax for formulas and equations.
            5. Include a "Key Takeaways" section.
            6. For visual learners, suggest diagrams or visual aids where needed.
            7. For auditory learners, emphasize key phrases or mnemonics.
            8. For kinesthetic learners, propose practical applications or hands-on activities related to the content.
            9. For analytical learners, include logical breakdowns and connections between concepts.

            Generate the notes in JSON format with the key "notes".
            """
        )

        # Prepare the input data for the prompt
        prompt_input = {
            "lecture_text": lecture_text,
            "learningStyle": learningStyle,
            "levelOfStudy": levelOfStudy,
            "course": course,
            "notesStyle": notesStyle,
        }

        # Set up the chain with the prompt template and the LLM
        llm_chain = LLMChain(
            llm=self.llm,
            prompt=prompt_template,
            output_key="notes"
        )

        # Run the chain
        result = llm_chain.run(prompt_input)

        print("Raw response content:", result)  # Log the raw response

        # Parse the result using the json module
        try:
            parsed_output = json.loads(result)
        except json.JSONDecodeError as e:
            print(f"Error parsing JSON output: {e}")
            raise

        return parsed_output if "notes" in parsed_output else {"notes": []}


    def get_last_sentence_from_notes(self, data):
        # Check if data is a list and contains at least one dictionary with "notes" key
        if isinstance(data, list) and len(data) > 0 and isinstance(data[0], dict):
            notes = data[0].get("notes", [])
            
            # Filter out empty strings and take the last non-empty entry
            meaningful_sentences = [note.strip() for note in notes if note.strip()]
            
            if meaningful_sentences:
                # Return the last meaningful sentence or phrase
                return meaningful_sentences[-1]
            else:
                return "No valid sentences found"
        else:
            return "Invalid data format"

    def extract_last_title(self, note_list):
        # Check if the input is valid
        if not note_list or 'notes' not in note_list[0]:
            return None, None
        
        # Get the markdown text from the first dictionary
        markdown_text = note_list[0]['notes']
        
        # Split the text into lines
        lines = markdown_text.strip().split('\n')
        
        last_title = None
        content = []

        # Iterate through the lines in reverse order
        for line in reversed(lines):
            line = line.strip()  # Strip leading and trailing whitespace
            
            # Check if the line is a title (starts with #)
            if line.startswith('#'):
                if last_title is None:  # Only assign if it's the first title found
                    last_title = line.lstrip('#').strip()
                else:
                    break  # Stop after finding the last title

            # If we have found the last title, collect the content
            if last_title is not None:
                content.append(line)

        # Reverse the content list to maintain the original order
        content.reverse()
        
        # Join the content into a single string
        content_str = '\n'.join(content).strip()
        
        return last_title, content_str
