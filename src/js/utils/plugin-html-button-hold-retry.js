/**
 * plugin-html-button-hold-response
 *
 * A jsPsych plugin adapted from html-button-response that measures how long
 * a button is held down. Tracks:
 *   - press_time:    ms from trial start to mousedown/touchstart
 *   - release_time:  ms from trial start to mouseup/touchend
 *   - hold_duration: release_time - press_time (ms)
 *   - response:      index of the button that was held
 *
 * The button gives a visual "active" signal while held (via CSS class
 * "jspsych-btn-held"), and the trial ends on release (mouseup / touchend).
 *
 * When retries_allowed is set to an integer N, after each valid hold the
 * participant sees a Retry button and can redo their response up to N times.
 * All attempts (including retried ones) are saved in the `all_attempts` array.
 * The accepted/final response fields (press_time, release_time, hold_duration,
 * response, rt) always reflect the last accepted attempt.
 *
 * Compatible with jsPsych v8.x
 *
 * Usage:
 *   <script src="plugin-html-button-hold-response.js"></script>
 *
 *   var trial = {
 *     type: jsPsychHtmlButtonHoldResponse,
 *     stimulus: '<p>Hold the button for as long as you feel confident.</p>',
 *     choices: ['Respond'],
 *     min_hold_duration: 0,
 *     retries_allowed: 2,   // null = no retry option (default)
 *   };
 */

var jsPsychHtmlButtonHoldResponse = (function (jspsych) {
  "use strict";

  const info = {
    name: "html-button-hold-response",
    version: "1.1.0",
    parameters: {
      /** HTML string to display as the stimulus. */
      stimulus: {
        type: jspsych.ParameterType.HTML_STRING,
        default: undefined,
      },
      /** Labels for the buttons. Each string produces one button. */
      choices: {
        type: jspsych.ParameterType.STRING,
        array: true,
        default: undefined,
      },
      /**
       * A function that receives (choice, index) and returns an HTML string
       * for the button. Defaults to a standard jspsych-btn button.
       */
      button_html: {
        type: jspsych.ParameterType.FUNCTION,
        default: function (choice, _index) {
          return `<button class="jspsych-btn">${choice}</button>`;
        },
      },
      /** HTML string shown below the stimulus (e.g. instructions). */
      prompt: {
        type: jspsych.ParameterType.HTML_STRING,
        default: null,
      },
      /** How long to show the stimulus before ending the trial (ms). Null = wait for response. */
      stimulus_duration: {
        type: jspsych.ParameterType.INT,
        default: null,
      },
      /** Maximum time to wait for a complete press-and-release (ms). Null = no limit. */
      trial_duration: {
        type: jspsych.ParameterType.INT,
        default: null,
      },
      /**
       * Minimum hold duration required for the release to count (ms).
       * If the participant releases before this time, the button returns to
       * its normal state and they must press again.
       */
      min_hold_duration: {
        type: jspsych.ParameterType.INT,
        default: 10,
      },
      /** Layout of buttons: 'flex' or 'grid'. */
      button_layout: {
        type: jspsych.ParameterType.STRING,
        default: "flex",
      },
      /** Number of grid columns (only used when button_layout = 'grid'). */
      grid_columns: {
        type: jspsych.ParameterType.INT,
        default: null,
      },
      /** If true, the trial ends as soon as a valid hold is completed (and
       *  retries are either not allowed or exhausted / declined). */
      response_ends_trial: {
        type: jspsych.ParameterType.BOOL,
        default: true,
      },
      /** If true, buttons are disabled once a valid response is recorded. */
      enable_button_after_response: {
        type: jspsych.ParameterType.BOOL,
        default: false,
      },
      /**
       * Number of retries the participant may take after a valid hold.
       *
       * null  → no retry UI is shown; trial ends (or continues) as normal.
       * 0     → retry UI appears but the retry button is disabled immediately
       *         (participant must confirm but cannot redo). Prefer null instead.
       * N > 0 → participant may redo their hold up to N times.
       *
       * Each attempt (accepted or retried) is recorded in `all_attempts`.
       * The scalar data fields (press_time, release_time, hold_duration, rt,
       * response) always reflect the final accepted attempt.
       */
      retries_allowed: {
        type: jspsych.ParameterType.INT,
        default: null,
      },
      /** Label for the retry button shown after a valid hold. */
      retry_button_label: {
        type: jspsych.ParameterType.STRING,
        default: "Retry",
      },
      /** Label for the confirm / accept button shown after a valid hold. */
      confirm_button_label: {
        type: jspsych.ParameterType.STRING,
        default: "Submit this answer",
      },
      /**
       * If true (default), shows the hold duration in ms after each valid hold.
       * If false, shows "Are you satisfied with your attempt?" instead.
       */
      show_hold_duration_feedback: {
        type: jspsych.ParameterType.BOOL,
        default: true,
      },
    },
    data: {
      /** The HTML content of the stimulus. */
      stimulus: { type: jspsych.ParameterType.HTML_STRING },
      /** Index of the button held on the final accepted attempt (0-based). */
      response: { type: jspsych.ParameterType.INT },
      /** Time from trial start to mousedown on the final accepted attempt (ms). */
      press_time: { type: jspsych.ParameterType.INT },
      /** Time from trial start to mouseup on the final accepted attempt (ms). */
      release_time: { type: jspsych.ParameterType.INT },
      /** Hold duration of the final accepted attempt (ms). */
      hold_duration: { type: jspsych.ParameterType.INT },
      /** Conventional rt field = press_time of final attempt (pipeline compatibility). */
      rt: { type: jspsych.ParameterType.INT },
      /**
       * Array of every attempt object. Present only when retries_allowed !== null.
       * Each entry: { attempt, button, press_time, release_time, hold_duration, accepted }
       */
      all_attempts: { type: jspsych.ParameterType.COMPLEX },
      /** Number of retries actually used. Present only when retries_allowed !== null. */
      retries_used: { type: jspsych.ParameterType.INT },
      /** Hold duration of the first attempt (ms). Equals hold_duration when no retry was taken. */
      first_attempt_hold_duration: { type: jspsych.ParameterType.INT },
    },
  };

  class HtmlButtonHoldResponsePlugin {
    constructor(jsPsych) {
      this.jsPsych = jsPsych;
    }

    trial(display_element, trial) {

      // ── Inject styles ───────────────────────────────────────────────────────
      const styleEl = document.createElement("style");
      styleEl.textContent = `
        .jspsych-html-button-hold-response-button .jspsych-btn {
          font-size: 1.2em;
        }
        .jspsych-btn-held {
          filter: brightness(0.8);
          transform: scale(0.97);
          box-shadow: inset 0 2px 6px rgba(0,0,0,0.35);
          transition: filter 0.05s, transform 0.05s, box-shadow 0.05s;
        }
        #jspsych-hold-response-post-actions {
          margin-top: 16px;
          display: flex;
          gap: 10px;
          justify-content: center;
          align-items: center;
        }
        #jspsych-hold-response-attempt-counter {
          font-size: 0.85em;
          color: #666;
          margin-top: 8px;
          text-align: center;
        }
        #jspsych-hold-response-last-duration {
          font-size: 0.9em;
          color: #333;
          margin-top: 8px;
          text-align: center;
        }
      `;
      document.head.appendChild(styleEl);

      // ── Build HTML ──────────────────────────────────────────────────────────
      const layoutStyle =
        trial.button_layout === "grid" && trial.grid_columns
          ? `display:grid; grid-template-columns: repeat(${trial.grid_columns}, 1fr);`
          : `display:flex; flex-wrap:wrap; justify-content:center;`;

      let html = `<div id="jspsych-html-button-hold-response-stimulus">${trial.stimulus}</div>`;
      html += `<div id="jspsych-html-button-hold-response-btngroup" style="${layoutStyle}">`;
      for (let i = 0; i < trial.choices.length; i++) {
        html += `<div class="jspsych-html-button-hold-response-button"
                      data-choice="${i}"
                      style="display:inline-block; margin:4px;">
                   ${trial.button_html(trial.choices[i], i)}
                 </div>`;
      }
      html += `</div>`;
      if (trial.prompt !== null) html += trial.prompt;

      // Placeholders for post-hold UI
      html += `<div id="jspsych-hold-response-last-duration"    style="display:none;"></div>`;
      html += `<div id="jspsych-hold-response-attempt-counter"  style="display:none;"></div>`;
      html += `<div id="jspsych-hold-response-post-actions"     style="display:none;"></div>`;

      display_element.innerHTML = html;

      // ── State ───────────────────────────────────────────────────────────────
      let response = {
        button: null,
        press_time: null,
        release_time: null,
        hold_duration: null,
      };

      const allAttempts   = [];   // populated only when retries_allowed !== null
      let attemptNumber   = 0;
      let retriesUsed     = 0;
      let firstAttemptHoldDuration = null;
      let trialComplete   = false;
      let currentPressIndex = null;
      let currentPressTime  = null;

      const startTime       = performance.now();
      const retriesEnabled  = trial.retries_allowed !== null;
      let retriesRemaining  = retriesEnabled ? trial.retries_allowed : 0;

      // ── Helpers ─────────────────────────────────────────────────────────────
      const getButtonEl = (index) => {
        const wrapper = display_element.querySelector(
          `.jspsych-html-button-hold-response-button[data-choice="${index}"]`
        );
        return wrapper
          ? wrapper.querySelector("button, [role=button]") ?? wrapper.firstElementChild
          : null;
      };

      const setHoldButtonsDisabled = (disabled) => {
        display_element
          .querySelectorAll(".jspsych-html-button-hold-response-button button")
          .forEach((b) =>
            disabled ? b.setAttribute("disabled", "disabled") : b.removeAttribute("disabled")
          );
      };

      // ── End trial ───────────────────────────────────────────────────────────
      const endTrial = () => {
        if (trialComplete) return;
        trialComplete = true;

        this.jsPsych.pluginAPI.clearAllTimeouts();
        styleEl.remove();

        display_element
          .querySelectorAll(".jspsych-html-button-hold-response-button")
          .forEach((wrapper) => {
            const btn =
              wrapper.querySelector("button, [role=button]") ?? wrapper.firstElementChild;
            if (btn) {
              btn.removeEventListener("mousedown", onMouseDown);
              btn.removeEventListener("touchstart", onTouchStart);
            }
          });
        document.removeEventListener("mouseup", onMouseUp);
        document.removeEventListener("touchend", onTouchEnd);

        const trialData = {
          stimulus:      trial.stimulus,
          response:      response.button,
          press_time:    response.press_time    !== null ? Math.round(response.press_time)    : null,
          release_time:  response.release_time  !== null ? Math.round(response.release_time)  : null,
          hold_duration: response.hold_duration !== null ? Math.round(response.hold_duration) : null,
          rt:            response.press_time    !== null ? Math.round(response.press_time)    : null,
          first_attempt_hold_duration: firstAttemptHoldDuration !== null ? Math.round(firstAttemptHoldDuration) : null,
        };

        if (retriesEnabled) {
          trialData.all_attempts = allAttempts;
          trialData.retries_used = retriesUsed;
        }

        display_element.innerHTML = "";
        this.jsPsych.finishTrial(trialData);
      };

      // ── Post-hold UI ─────────────────────────────────────────────────────────
      const showPostHoldUI = () => {
        // Duration feedback
        const durationEl = display_element.querySelector("#jspsych-hold-response-last-duration");
        durationEl.style.display = "block";
        durationEl.textContent = trial.show_hold_duration_feedback
          ? `Hold duration: ${Math.round(response.hold_duration)} ms`
          : "Are you satisfied with your attempt?";

        // Retry counter
        const counterEl = display_element.querySelector("#jspsych-hold-response-attempt-counter");
        counterEl.style.display = "block";
        counterEl.textContent =
          retriesRemaining > 0
            ? `Retries remaining: ${retriesRemaining}`
            : `No retries remaining`;

        // Action buttons
        const actionsEl = display_element.querySelector("#jspsych-hold-response-post-actions");
        actionsEl.style.display = "flex";
        actionsEl.innerHTML = "";

        // Accept / confirm
        const confirmBtn = document.createElement("button");
        confirmBtn.className = "jspsych-btn";
        confirmBtn.textContent = trial.confirm_button_label;
        confirmBtn.addEventListener("click", () => {
          if (allAttempts.length > 0) {
            allAttempts[allAttempts.length - 1].accepted = true;
          }
          endTrial();
        });
        actionsEl.appendChild(confirmBtn);

        // Retry (only if retries remain)
        if (retriesRemaining > 0) {
          const retryBtn = document.createElement("button");
          retryBtn.className = "jspsych-btn";
          retryBtn.textContent = trial.retry_button_label;
          retryBtn.addEventListener("click", () => {
            retriesRemaining--;
            retriesUsed++;

            // Mark previous attempt as not accepted
            if (allAttempts.length > 0) {
              allAttempts[allAttempts.length - 1].accepted = false;
            }

            // Reset post-hold UI and re-enable hold buttons
            actionsEl.style.display = "none";
            actionsEl.innerHTML = "";
            durationEl.style.display = "none";
            counterEl.style.display = "none";

            setHoldButtonsDisabled(false);
          });
          actionsEl.appendChild(retryBtn);
        }
      };

      // ── Valid hold completed ─────────────────────────────────────────────────
      const onValidHold = (buttonIndex, pressTime, releaseTime, holdDuration) => {
        attemptNumber++;

        response.button       = buttonIndex;
        response.press_time   = pressTime;
        response.release_time = releaseTime;
        response.hold_duration = holdDuration;

        if (attemptNumber === 1) {
          firstAttemptHoldDuration = holdDuration;
        }

        if (retriesEnabled) {
          allAttempts.push({
            attempt:       attemptNumber,
            button:        buttonIndex,
            press_time:    Math.round(pressTime),
            release_time:  Math.round(releaseTime),
            hold_duration: Math.round(holdDuration),
            accepted:      null, // resolved on confirm or retry click
          });

          setHoldButtonsDisabled(true);
          showPostHoldUI();
        } else {
          if (!trial.enable_button_after_response) {
            setHoldButtonsDisabled(true);
          }
          if (trial.response_ends_trial) {
            endTrial();
          }
        }
      };

      // ── Mouse / touch handlers ───────────────────────────────────────────────
      const onPress = (buttonIndex) => {
        if (trialComplete) return;
        currentPressIndex = buttonIndex;
        currentPressTime  = performance.now() - startTime;

        const btn = getButtonEl(buttonIndex);
        if (btn) btn.classList.add("jspsych-btn-held");
      };

      const onRelease = () => {
        if (trialComplete || currentPressIndex === null) return;

        const releaseTime  = performance.now() - startTime;
        const holdDuration = releaseTime - currentPressTime;

        const btn = getButtonEl(currentPressIndex);
        if (btn) btn.classList.remove("jspsych-btn-held");

        const capturedIndex     = currentPressIndex;
        const capturedPressTime = currentPressTime;
        currentPressIndex = null;
        currentPressTime  = null;

        if (holdDuration < trial.min_hold_duration) {
          return; // too short — silent reset, participant can try again
        }

        onValidHold(capturedIndex, capturedPressTime, releaseTime, holdDuration);
      };

      const onMouseDown = (e) => {
        const wrapper = e.currentTarget.closest(".jspsych-html-button-hold-response-button");
        if (!wrapper) return;
        e.preventDefault();
        onPress(parseInt(wrapper.dataset.choice));
      };

      const onMouseUp = () => {
        if (currentPressIndex !== null) onRelease();
      };

      const onTouchStart = (e) => {
        const wrapper = e.currentTarget.closest(".jspsych-html-button-hold-response-button");
        if (!wrapper) return;
        e.preventDefault();
        onPress(parseInt(wrapper.dataset.choice));
      };

      const onTouchEnd = () => {
        if (currentPressIndex !== null) onRelease();
      };

      display_element
        .querySelectorAll(".jspsych-html-button-hold-response-button")
        .forEach((wrapper) => {
          const btn =
            wrapper.querySelector("button, [role=button]") ?? wrapper.firstElementChild;
          if (btn) {
            btn.addEventListener("mousedown", onMouseDown);
            btn.addEventListener("touchstart", onTouchStart, { passive: false });
          }
        });

      document.addEventListener("mouseup", onMouseUp);
      document.addEventListener("touchend", onTouchEnd);

      // ── Optional: hide stimulus after stimulus_duration ──────────────────────
      if (trial.stimulus_duration !== null) {
        this.jsPsych.pluginAPI.setTimeout(() => {
          const stimEl = display_element.querySelector(
            "#jspsych-html-button-hold-response-stimulus"
          );
          if (stimEl) stimEl.style.visibility = "hidden";
        }, trial.stimulus_duration);
      }

      // ── Optional: end trial after trial_duration ─────────────────────────────
      if (trial.trial_duration !== null) {
        this.jsPsych.pluginAPI.setTimeout(endTrial, trial.trial_duration);
      }

    } // end trial()

    // ── Simulation ──────────────────────────────────────────────────────────────
    simulate(trial, simulation_mode, simulation_options, load_callback) {
      if (simulation_mode === "data-only") {
        load_callback();
        this._simulateResponse(trial, simulation_options);
      } else if (simulation_mode === "visual") {
        this._simulateVisual(trial, simulation_options, load_callback);
      }
    }

    _simulateResponse(trial, simulation_options) {
      const retriesEnabled = trial.retries_allowed !== null;
      const numAttempts = retriesEnabled
        ? Math.floor(Math.random() * (trial.retries_allowed + 1)) + 1
        : 1;

      const allAttempts = [];
      let lastPressTime = Math.round(Math.random() * 300 + 200);

      for (let i = 0; i < numAttempts; i++) {
        const holdDuration = Math.round(
          Math.max(trial.min_hold_duration, Math.random() * 500 + 100)
        );
        const releaseTime = lastPressTime + holdDuration;
        allAttempts.push({
          attempt:       i + 1,
          button:        Math.floor(Math.random() * trial.choices.length),
          press_time:    lastPressTime,
          release_time:  releaseTime,
          hold_duration: holdDuration,
          accepted:      i === numAttempts - 1,
        });
        lastPressTime = releaseTime + Math.round(Math.random() * 500 + 300);
      }

      const final = allAttempts[allAttempts.length - 1];
      const trialData = {
        stimulus:      trial.stimulus,
        response:      final.button,
        press_time:    final.press_time,
        release_time:  final.release_time,
        hold_duration: final.hold_duration,
        rt:            final.press_time,
        first_attempt_hold_duration: allAttempts[0].hold_duration,
      };
      if (retriesEnabled) {
        trialData.all_attempts = allAttempts;
        trialData.retries_used = numAttempts - 1;
      }

      this.jsPsych.finishTrial(trialData);
    }

    _simulateVisual(trial, simulation_options, load_callback) {
      const display_element = this.jsPsych.getDisplayElement();
      this.trial(display_element, trial);
      load_callback();

      const pressTime    = Math.round(Math.random() * 300 + 200);
      const holdDuration = Math.round(
        Math.max(trial.min_hold_duration, Math.random() * 500 + 100)
      );
      const button = Math.floor(Math.random() * trial.choices.length);

      this.jsPsych.pluginAPI.setTimeout(() => {
        const wrapper = display_element.querySelector(
          `.jspsych-html-button-hold-response-button[data-choice="${button}"]`
        );
        if (wrapper) {
          const btn =
            wrapper.querySelector("button, [role=button]") ?? wrapper.firstElementChild;
          if (btn) btn.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
        }
      }, pressTime);

      this.jsPsych.pluginAPI.setTimeout(() => {
        document.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
        // If retries are enabled, simulate clicking Accept after a short pause
        if (trial.retries_allowed !== null) {
          this.jsPsych.pluginAPI.setTimeout(() => {
            const actionsEl = display_element.querySelector(
              "#jspsych-hold-response-post-actions"
            );
            if (actionsEl) {
              const confirmBtn = actionsEl.querySelector("button");
              if (confirmBtn) confirmBtn.click();
            }
          }, 300);
        }
      }, pressTime + holdDuration);
    }
  }

  HtmlButtonHoldResponsePlugin.info = info;
  return HtmlButtonHoldResponsePlugin;
})(jsPsychModule);