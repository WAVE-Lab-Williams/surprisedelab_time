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
    
    if (runStaticImgDisp){
        var target_x_random = (w/2)-(imgWidth/2); // forces middle of the screen, accounts for any size of the image
        var target_y_random = (h/2)-(imgHeight/2)-(imgHeight/3); // forces middle of screen, but because h is a variable that captured before forced full screen runs, it has all the tabs and junk pushing the "center" of the screen down. So I've built in a 1/3rd of height of img buffer. NOTE: Because this buffer is hardcoded, this may encounter issues in future versions, especially if the image is especially vertically elongated. A good programmer would take time to solve this possible future incompatibility. 
        /* randomize location of the target image, and also categorize where that location is */
    } else {
        var target_x_random = randomIntFromRange(100, w-100-imgWidth); // accounts for img dims to not go off screen
        var target_y_random = randomIntFromRange(50, h-50-imgHeight)-(imgHeight/3); // see above for why we include 1/3rd height of img buffer just for y_position
    }

    if (runStaticImgDisp) {
        var screenside_category = "Static Middle"
    } else if ( (target_x_random+imgWidth/2) < w/2) {
        var screenside_category = "L"
    } else if ( (target_x_random+imgWidth/2) >= w/2) {
        var screenside_category = "R"
    } else {
        var screenside_category = "Error"
    }
    // logs where the stim actually are on the screen
    // console.log("Stimulus:", thisStim);
    // console.log("X position:", target_x_random);
    // console.log("Y position:", target_y_random);
    // console.log("Screen side:", screenside_category);

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
            target_x_position: target_x_random, // recall that this is left of image
            target_y_position: target_y_random, // recall that this is top of image
            true_trial_count: trueTrialCount,
            screenside_category: screenside_category,
        }, // data end
        on_finish: function(data){
            data.thisDifference = data.hold_duration - data.correct_response
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
            target_x_position: target_x_random, // recall that this is left of image
            target_y_position: target_y_random, // recall that this is top of image
            choice_array_order: choiceArray,
        },
        on_finish: function(data){
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
    };

    var dispImg = {
        type: jsPsychHtmlKeyboardResponse,    
        stimulus: `<div style="rotate:${personRotation}deg; position: absolute; top: ${target_y_random}px; left: ${target_x_random}px;">`+
            `<img src="${thisStim}" style="width:${imgWidth}px;" />` + 
            `</div>`,
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
    }; // dispImg end

    var attnTrial = {
        type: jsPsychHtmlButtonResponse,
        stimulus: `How would you describe the hairstyle you just saw?`,
        choices: ["Short Hair", "Long Hair", "Tied Back", "Unknown"],
        trial_duration: null,
        // prompt: `${persistent_prompt}`,
        data: {
            trial_category: 'attnTrial'+trialType,
        },
};

    var prestim = {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: "",
        choices: "NO_KEYS",
        trial_duration: PRESTIM_DISP_TIME,
        data: {
            trial_category: 'prestim_ISI' + trialType,
        }
    };

     var poststim = {
        type: jsPsychHtmlKeyboardResponse,
        // stimulus: `${persistent_prompt}`,
        stimulus: ``,
        choices: "NO_KEYS",
        trial_duration: POSTSTIM_DISP_TIME,
        data: {
            trial_category: 'poststim_ISI' + trialType,
        }
    };

    var fixation = {
        type: jsPsychHtmlKeyboardResponse,
        stimulus: `<div style="font-size:60px;">+</div>`,
        choices: "NO_KEYS",
        trial_duration: FIXATION_DISP_TIME,
        data: {
            trial_category: 'fixation' + trialType,
        }
    };


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
    if (attn_trial_list.includes (trueTrialCount)){
        timelineTrialsToPush.push(attnTrial);
}
     // timelineTrialsToPush.push(sexJudge);

};


