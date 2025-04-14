#!/usr/bin/env python3
"""
Convert WebDataset to VQA Annotation Interface format.

This script takes a WebDataset and converts it to the format expected by the VQA Annotation Interface.
It uses the pfqs_caption_webdataset_fixed.py script to generate questions from captions.
"""

import os
import sys
import json
import argparse
import subprocess
import shutil

def main():
    parser = argparse.ArgumentParser(description="Convert WebDataset to VQA Annotation Interface format")
    parser.add_argument("--data", type=str, required=True, help="Path to the WebDataset (can be a pattern like path/to/shard-{000000..000999}.tar)")
    parser.add_argument("--output", type=str, default="frontend/assets/annotation_data.json", help="Path to save the results")
    parser.add_argument("--model", type=str, default="gpt-4o", help="OpenAI model to use")
    parser.add_argument("--batch-size", type=int, default=10, help="Batch size for API calls")
    parser.add_argument("--samples", type=int, default=None, help="Number of samples to process (None for all)")
    parser.add_argument("--questions-per-attribute", type=int, default=1, help="Number of questions to generate per attribute")
    parser.add_argument("--include-images", action="store_true", help="Include image binary data in output")
    parser.add_argument("--shuffle", action="store_true", help="Shuffle the dataset")
    
    args = parser.parse_args()
    
    # Check if pfqs_caption_webdataset_fixed.py exists
    script_path = "pfqs_caption_webdataset_fixed.py"
    if not os.path.exists(script_path):
        # Check if it's in the parent directory
        parent_script_path = os.path.join("..", script_path)
        if os.path.exists(parent_script_path):
            script_path = parent_script_path
        else:
            print(f"Error: {script_path} not found. Please make sure it's in the current or parent directory.")
            sys.exit(1)
    
    # Build the command
    cmd = [
        sys.executable,
        script_path,
        "--data", args.data,
        "--output", "temp_output.json",
        "--model", args.model,
        "--batch-size", str(args.batch_size),
        "--questions-per-attribute", str(args.questions_per_attribute)
    ]
    
    if args.samples:
        cmd.extend(["--samples", str(args.samples)])
    
    if args.include_images:
        cmd.append("--include-images")
    
    if args.shuffle:
        cmd.append("--shuffle")
    
    # Run the command
    print(f"Running command: {' '.join(cmd)}")
    try:
        subprocess.run(cmd, check=True)
    except subprocess.CalledProcessError as e:
        print(f"Error running pfqs_caption_webdataset_fixed.py: {e}")
        sys.exit(1)
    
    # Check if the output file was created
    if not os.path.exists("temp_output.json"):
        print("Error: temp_output.json not found. The script may have failed.")
        sys.exit(1)
    
    # Create the output directory if it doesn't exist
    output_dir = os.path.dirname(args.output)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir)
    
    # Move the output file to the desired location
    shutil.move("temp_output.json", args.output)
    
    print(f"Conversion complete. Output saved to {args.output}")
    print(f"You can now run the annotation interface with: python run.py")

if __name__ == "__main__":
    main()
