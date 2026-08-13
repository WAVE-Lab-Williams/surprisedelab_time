/*
===============================================================
PUSHING/RUNNING A CUSTOM SINGLE TRIAL (*singleTrial)
===============================================================
*/
function runSingleTrial(
    personRace,
    personSex,
    personVariation,
    personRotation,
    dispDuration,
    trueTrialCount,
    timelineTrialsToPush,
    trialType,
) {

    /*--------------------------- General Utility ---------------------------*/
    var checkScreen = {
        type: jsPsychFullscreen,
        message:
            '<p>Unfortunately, it appears you are no longer in fullscreen mode. Please make sure to remain in fullscreen mode. <br>Click on the button to fullscreen the experiment again and proceed.</p>',
        fullscreen_mode: true,
        button_label: 'Resume',
    };

    var if_notFull = {
        timeline: [checkScreen],
        conditional_function: function () {
            if (full_check == false) {
                return true;
            } else {
                return false;
            }
        },
    };

    var cursor_off = {
        type: jsPsychCallFunction,
        func: function () {
            document.body.style.cursor = 'none';
        },
    };

    var cursor_on = {
        type: jsPsychCallFunction,
        func: function () {
            document.body.style.cursor = 'auto';
        },
    };

    /*--------------------------- Experiment specific variables ---------------------------*/
    
    var thisStim = `${stimFolder}${personRace}${personSex}-${personVariation}.png`

    // Set inside dispImg's stimulus function (JSPsych only knows w/h at render time),
    // then read by dispImg's own on_finish and by later trials in this same call.
    var target_x_random, target_y_random, screenside_category;

    var dispImg = {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: function(){
            var w = window.innerWidth;
            var h = window.innerHeight;

            if (runStaticImgDisp){
                target_x_random = (w/2) - (imgWidth/2); // middle of screen with new live w values
                target_y_random = (h/2) - (imgHeight/2); // middle of screen with new live h values, no buffer needed
                screenside_category = "Static Middle";
                /* location of target image randomized and log location */
            } else {
                target_x_random = randomIntFromRange(100, w-100-imgWidth); // keeps img on screen
                target_y_random = randomIntFromRange(50, h-50-imgHeight);

                if ( (target_x_random + imgWidth/2) < w/2) {
                    screenside_category = "L";
                } else {
                    screenside_category = "R";
                }
            }

        return `<div style="rotate:${personRotation}deg; position: fixed; top: ${target_y_random}px; left: ${target_x_random}px;">`+
            `<img src="${thisStim}" style="width:${imgWidth}px; height:${imgHeight}px;" />` +
            `</div>`;
        }, // end style
        choices: "NO_KEYS",
        trial_duration: dispDuration,
        // prompt: `${persistent_prompt}`,
        data: {
            trial_category: 'dispImg'+trialType,
            // trial_stimulus: thisStim,
            // trial_duration: dispDuration,
            // target_width: target_width,
            // target_height: target_height,
        }, // data end
        on_finish: function(data){
            data.target_x_position = target_x_random;
            data.target_y_position = target_y_random;
            data.screenside_category = screenside_category;
            console.log(`[${data.trial_category}] x: ${data.target_x_position}, y: ${data.target_y_position}, side: ${data.screenside_category}`);
        } // on finish end
    }; // dispImg end

    // logs where the stim actually are on the screen
    // console.log("Stimulus:", thisStim);
    // console.log("X position:", target_x_random);
    // console.log("Y position:", target_y_random);
    // console.log("Screen side:", screenside_category);

    // console.log("img width:", imgWidth);
    // console.log("img height:", imgHeight);

    // console.log(w)
    // console.log(`Where the left of the image will be positioned target_x_random: ${target_x_random}`)
    // console.log(`target_width: ${target_width}`)
    // console.log(h)
    // console.log(`Where the top of the image will be positioned target_y_random: ${target_y_random}`)
    // console.log(`target_height: ${target_height}`)


    var holdResponse = {
        type: jsPsychHtmlButtonSpaceHoldResponse,
        // stimulus: `Now please try to <b>reproduce how long</b> the image stayed on screen. Click and hold down the button below for the same amount of time that you saw the image. <p>Releasing the button will <b>automatically submit</b> your response!</p><p>You have <b>only ONE try!</b></p>`,
        stimulus: `Now try to replicate how long the image was on the screen (Use the <u>Spacebar</u>):`,
        choices: ["Click, hold, and release the Spacebar for the right amount of time!"],
        show_hold_duration_feedback: false,
        retries_allowed: null, // change to a number of allowed retries. Default is null.
        data: {
            trial_category: 'answer'+trialType,
            trial_stimulus: thisStim,
            correct_response: dispDuration,
            person_race: personRace,
            person_sex: personSex,
            person_variation: personVariation,
            person_rotation: personRotation,
            person_disp_duration: dispDuration,
            true_trial_count: trueTrialCount,
        }, // data end
        on_finish: function(data){
            data.thisDifference = data.hold_duration - data.correct_response
            data.target_x_position = target_x_random;
            data.target_y_position = target_y_random;
            data.screenside_category = screenside_category;
            console.log(`[${data.trial_category}] x: ${data.target_x_position}, y: ${data.target_y_position}, side: ${data.screenside_category}`);
        } // on finish end
    }; // holdResponse end

    var choiceArray = shuffle(["Looked Male", "Looked Female"])
    var sexJudge = {
        type: jsPsychHtmlButtonResponse,
        stimulus: `<p>What was the <b>gender</b> of person in the image that you saw?</p>`,
        choices: choiceArray,
        button_html: '<button class="jspsych-btn" style="font-size: 2.4vh;">%choice%</button>',
        data: {
            trial_category: 'judge'+trialType,
            trial_stimulus: thisStim,
            correct_gender: personSex,
            person_race: personRace,
            person_sex: personSex,
            person_variation: personVariation,
            person_rotation: personRotation,
            person_disp_duration: dispDuration,
            // target_x_position: x_value, // recall that this is left of image
            // target_y_position: y_value, // recall that this is top of image
            choice_array_order: choiceArray,
        },
        on_finish: function(data){
            data.target_x_position = target_x_random;
            data.target_y_position = target_y_random;
            data.screenside_category = screenside_category;
            console.log(`[${data.trial_category}] x: ${data.target_x_position}, y: ${data.target_y_position}, side: ${data.screenside_category}`);
            // console.log(data.response)
            // console.log(choiceArray)
            // console.log(choiceArray[parseInt(data.response,10)])
            if (data.correct_gender == "M"){
                if (choiceArray[parseInt(data.response,10)] == "Looked Male"){
                    data.thisAcc = 1
                } else if (choiceArray[parseInt(data.response,10)] == "Looked Female"){
                    data.thisAcc = 0
                } else {
                    data.thisAcc = 98
                }
            } else if (data.correct_gender == "F"){
                if (choiceArray[parseInt(data.response,10)] == "Looked Male"){
                    data.thisAcc = 0
                } else if (choiceArray[parseInt(data.response,10)] == "Looked Female"){
                    data.thisAcc = 1
                } else {
                    data.thisAcc = 98
                }
            } else {
                data.thisAcc == 99
            }
            return 
        }
    }; // sexJudge end 

    var attnTrial = {
        type: jsPsychHtmlButtonResponse,
        stimulus: `How would you describe the hairstyle you just saw?`,
        choices: ["Short Hair", "Long Hair", "Tied Back", "Unknown"],
        trial_duration: null,
        // prompt: `${persistent_prompt}`,
        data: {
            trial_category: 'attnTrial'+trialType,
        }, 
    }; // attn trial end

    var prestim = {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: "",
        choices: "NO_KEYS",
        trial_duration: PRESTIM_DISP_TIME,
        data: {
            trial_category: 'prestim_ISI' + trialType,
        }
    }; //prestim end

     var poststim = {
        type: jsPsychHtmlKeyboardResponse,
        // stimulus: `${persistent_prompt}`,
        stimulus: ``,
        choices: "NO_KEYS",
        trial_duration: POSTSTIM_DISP_TIME,
        data: {
            trial_category: 'poststim_ISI' + trialType,
        }
    }; // poststim end

    var fixation = {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: `<div style="font-size:60px;">+</div>`,
        choices: "NO_KEYS",
        trial_duration: FIXATION_DISP_TIME,
        data: {
            trial_category: 'fixation' + trialType,
        }
    }; // fixation end 


    /*--------------------------- push single trial sequence ---------------------------*/

    var attn_trial_list = [6, 12, 24, 32, 40]

    timelineTrialsToPush.push(if_notFull);
    timelineTrialsToPush.push(cursor_off);
    timelineTrialsToPush.push(prestim);
    timelineTrialsToPush.push(fixation);
    timelineTrialsToPush.push(dispImg);
    timelineTrialsToPush.push(poststim)
    timelineTrialsToPush.push(cursor_on);
    timelineTrialsToPush.push(holdResponse);
    // if (attn_trial_list.includes(trueTrialCount)){
    //     timelineTrialsToPush.push(attnTrial); 
    // };

};


