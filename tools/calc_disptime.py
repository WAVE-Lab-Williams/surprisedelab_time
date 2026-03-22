import pandas as pd
import os

# Read in the data
script_dir = os.path.dirname(os.path.abspath(__file__))
csvfull = 'dataframe_full_all.csv'
csvanswer = 'dataframe_answer_filtered2outliers.csv'
df = pd.read_csv(os.path.join(script_dir, 'data', csvfull))


# Initialize the new column
df['person_disp_duration'] = None

# Process each participant separately
for pid in df['participant_id'].unique():
    mask = df['participant_id'] == pid
    participant_df = df.loc[mask].sort_values('time_elapsed')

    indices = participant_df.index.tolist()
    categories = participant_df['trial_category'].tolist()
    time_vals = participant_df['time_elapsed'].tolist()

    # Walk through this participant's trials in order
    last_fixation_time = None
    last_calced_duration = None

    for i, (idx, cat, t_elapsed) in enumerate(zip(indices, categories, time_vals)):
        if cat == 'fixationexpt':
            last_fixation_time = t_elapsed
        elif cat == 'dispImgexpt' and last_fixation_time is not None:
            last_calced_duration = t_elapsed - last_fixation_time
            df.at[idx, 'person_disp_duration'] = last_calced_duration
        elif cat == 'answerexpt' and last_calced_duration is not None:
            df.at[idx, 'person_disp_duration'] = last_calced_duration
            # Reset after pairing to avoid carrying over to unrelated trials
            last_calced_duration = None

# Save dataframe_full.csv
output_path = os.path.join(script_dir, 'data', csvfull)
df.to_csv(output_path, index=False)
print(f"Saved to {output_path}")

# --- Update dataframe_answer.csv with person_disp_duration ---
answer_path = os.path.join(script_dir, 'data', csvanswer)
df_answer = pd.read_csv(answer_path)

# Build a lookup from the afcexpt rows in dataframe_full: (participant_id, time_elapsed) -> person_disp_duration
answer_full = df[(df['trial_category'] == 'answerexpt') & (df['person_disp_duration'].notna())]
lookup = answer_full.set_index(['participant_id', 'time_elapsed'])['person_disp_duration'].to_dict()

# Match into dataframe_answer by participant_id and time_elapsed
df_answer['person_disp_duration'] = df_answer.apply(
    lambda row: lookup.get((row['participant_id'], row['time_elapsed'])), axis=1
)

# Round to nearest 100
df_answer['person_disp_duration_rounded'] = (df_answer['person_disp_duration'] // 100) * 100
df_answer['person_disp_duration_rounded'] = df_answer['person_disp_duration_rounded'].astype('Int64')

df_answer.to_csv(answer_path, index=False)
print(f"Saved to {answer_path}")

# Print a quick summary
populated = df[df['person_disp_duration'].notna()]
print(f"\nPopulated {len(populated)} rows in {csvfull} with person_disp_duration:")
print(f"  dispImgexpt rows: {len(populated[populated['trial_category'] == 'dispImgexpt'])}")
print(f"  answerexpt rows: {len(populated[populated['trial_category'] == 'answerexpt'])}")

answer_populated = df_answer[df_answer['person_disp_duration'].notna()]
print(f"\nPopulated {len(answer_populated)} of {len(df_answer)} rows in {csvanswer}")
print(f"\nSample values from dataframe_answer.csv (ms):")
print(answer_populated[['participant_id', 'time_elapsed', 'person_disp_duration', 'person_disp_duration_rounded']].head(10).to_string(index=False))