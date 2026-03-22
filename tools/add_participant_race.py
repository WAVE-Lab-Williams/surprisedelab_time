import json
import pandas as pd
import os

working_dir = os.path.dirname(os.path.abspath(__file__))

debrief_filename = 'dataframe_debrief_2026-02-10.csv'
answer_filename = 'dataframe_answer_2026-02-10.csv'

df_debrief = pd.read_csv(os.path.join(working_dir, 'data', debrief_filename))
df_answer = pd.read_csv(os.path.join(working_dir, 'data', answer_filename))

# Parse the JSON response column to extract ethnicity, race, and other_text
def extract_field(response_str, field):
    try:
        data = json.loads(response_str)
        return data.get(field, "")
    except (json.JSONDecodeError, TypeError):
        return ""

df_debrief["ethnicity"] = df_debrief["response"].apply(lambda r: extract_field(r, "ethnicity"))
df_debrief["race"] = df_debrief["response"].apply(lambda r: extract_field(r, "race"))
df_debrief["other_text"] = df_debrief["response"].apply(lambda r: extract_field(r, "other_text"))

# If race is blank but other_text has content, set race to "other"
df_debrief.loc[
    (df_debrief["race"].str.strip() == "") & (df_debrief["other_text"].str.strip() != ""),
    "race"
] = "other"

# Build a lookup from participant_id to the three fields
race_lookup = df_debrief[["participant_id", "ethnicity", "race", "other_text"]].drop_duplicates(
    subset="participant_id"
)

# Drop columns from a previous run if they exist, so re-runs are safe
df_answer = df_answer.drop(columns=["ethnicity", "race", "other_text"], errors="ignore")

# Merge onto the answer dataframe by participant_id
df_answer = df_answer.merge(race_lookup, on="participant_id", how="left")

# Save the updated answer dataframe
df_answer.to_csv(os.path.join(working_dir, 'data', answer_filename), index=False)

print(f"Processed {len(race_lookup)} participants from debrief data.")
print(f"Updated dataframe_answer.csv with {len(df_answer)} rows.")
print("\nSample of added columns:")
print(df_answer[["participant_id", "ethnicity", "race", "other_text"]].drop_duplicates().to_string(index=False))
