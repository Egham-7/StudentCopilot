class ValidatePrompt:
    def __init__(self):
        # Initialize valid_prompts as a list
        self.valid_prompts = ["generate notes", "prompt2", "prompt3"]
    
    def validate(self, input_prompt):
        try:
            if input_prompt in self.valid_prompts:  # Check membership in the list
                return True
            else: 
                return False
        except Exception as e:
            print("General error:", str(e))
            raise
        