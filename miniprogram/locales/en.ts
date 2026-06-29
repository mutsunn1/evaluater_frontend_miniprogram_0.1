export default {
  common: {
    appTitle: "Chinese Proficiency Evaluation",
    appTitleFull: "Chinese Proficiency Evaluation System",
    appSubtitle: "AI-powered Chinese proficiency assessment",
    userId: "User ID",
    userIdPlaceholder: "Enter your user ID",
    startEvaluation: "Start Evaluation",
    loggingIn: "Logging in...",
    login: "Log In",
    logout: "Log Out",
    send: "Send",
    retry: "Retry",
    loading: "Loading...",
    endEvaluation: "End Evaluation",
    openProfile: "Open profile",
    cancel: "Cancel",
    audioLoadFailed: "Audio failed to load",
    language: {
      en: "EN",
      zh: "中文",
    },
    error: {
      backend: "Failed to connect to backend: {message}",
    },
  },
  chat: {
    welcome: {
      coldStart:
        "Welcome! Before the official assessment, I need to learn a bit about your background. Please answer in Chinese so I can estimate your level.",
      assessment:
        "Hello, I'm the Chinese proficiency assessment system. I'll evaluate your level based on your answers — please respond in Chinese.",
    },
    send: "Send",
    placeholder: {
      coldStart: "Please answer briefly...",
      answer: "Enter your answer...",
    },
    error: {
      generation: "Question generation failed",
    },
    thinking: {
      title: "Thinking Process",
      viewAll: "View all {count} thinking steps",
      labels: {
        planning: "Question Planning",
        vocabularyQuestion: "Vocabulary Question",
        grammarQuestion: "Grammar Question",
        readingQuestion: "Reading Question",
        listeningQuestion: "Listening Question",
        speakingQuestion: "Speaking Question",
        agentAnalysis: "Agent Analysis",
        compensation: "Question Compensation",
        questionSummary: "Question Summary",
        questionGenerationSummary: "Question Generation Summary",
        qaAgent: "Quality Check Agent",
        masterAgent: "Master Agent",
        coldStartAgent: "Cold Start Agent",
        behaviorObserver: "Behavior Observer",
        gradingAgent: "Grading Agent",
        system: "System",
      },
    },
    handwriting: {
      area: "Handwriting Area",
      notScored: "Handwriting answer (auto-scoring not yet supported)",
      panel: "Handwriting panel (coming soon)",
    },
    upload: {
      click: "Click to Upload",
      notScored: "File answer (auto-scoring not yet supported)",
      comingSoon: "Upload (coming soon)",
    },
    speech: {
      hint: "Record your spoken answer (up to 60 seconds)",
      start: "Start Recording",
      recording: "Recording",
      stop: "Stop Recording",
      recorded: "Recording complete",
      play: "Play",
      pause: "Stop",
      reRecord: "Re-record",
      upload: "Upload",
      uploading: "Uploading and transcribing...",
      transcriptTitle: "Transcript (read-only, for review)",
      confirm: "Confirm Submit",
      retryUpload: "Retry Upload",
      micError: "Cannot access microphone. Please check browser permissions.",
      missingSession: "Missing session ID, cannot upload.",
      transcribeFailed: "Transcription failed, please try again.",
      uploadFailed: "Upload failed. Please check your network and try again.",
    },
    answerInQuestion: "Please answer in the question above",
    loading: {
      generating: "Generating questions, please wait...",
      coldStart: "Preparing cold-start questions...",
      analyzing: "Analyzing your answer...",
      judging: "Evaluating answer...",
      nextRound: "Generating next round...",
    },
    autoStop: {
      title: "Evaluation automatically ended",
      stats: "Accuracy {accuracy}% · Confidence {confidence}%",
    },
    feedback: {
      correct: "Correct!",
      incorrect: "Incorrect.",
      recorded: "Answer recorded.",
      incorrectWithAnswer: "Incorrect. The correct answer is {answer}.",
      incorrectTrueFalse: "Incorrect. The correct answer is {answer}.",
      skipModality: {
        listening:
          "Skipped. Listening questions will not appear for the rest of this round.",
        speaking:
          "Skipped. Speaking questions will not appear for the rest of this round.",
        generic:
          "Skipped. This type of question will not appear for the rest of this round.",
      },
      received: {
        speech: "Speaking answer received.",
        handwriting:
          "Handwriting answer received (auto-scoring not yet supported).",
        upload: "Uploaded answer received (auto-scoring not yet supported).",
      },
      speechUnavailable:
        "Speaking scoring is temporarily unavailable. Please try again later.",
      emptySpeech: "No valid speech detected. Please record again.",
    },
    coldStart: {
      complete:
        "Cold-start assessment complete. Based on your performance, the system has gained a preliminary understanding of your Chinese level. The formal assessment begins now.",
      completeFallback:
        "Cold-start assessment complete. Entering formal assessment.",
      questionFailed: "Failed to load cold-start question",
      answerFailed: "Failed to submit cold-start answer",
      feedback: {
        recorded: "Round recorded.",
      },
      labels: {
        background: "Background",
        dailyExpression: "Daily Expression",
        stressTest: "Stress Test",
        boundaryCheckOne: "Boundary Check (1)",
        boundaryCheckTwo: "Boundary Check (2)",
      },
      questions: {
        background:
          "Hello! Welcome to the Chinese proficiency assessment system. Before the official assessment, I need to learn a bit about your background. Please answer briefly in Chinese.\n1. What is your native language?\n2. How long have you been learning Chinese?\n3. Why are you learning Chinese? (exam, work, interest, etc.)\nA few sentences are enough.",
        dailyExpression:
          "Thank you. I'd like to know about your daily expression ability.\nPlease describe in Chinese what you did yesterday. Just pick one or two things; it doesn't need to be long.",
        stressTest:
          "Great. Next, a small question:\nImagine you are outside and it suddenly starts raining heavily, but you forgot your umbrella.\nPlease say in Chinese what you would do. Try to use the 'because... so...' structure.",
        boundaryCheckOne:
          "One last question.\nSome people think smartphones make life lonelier, while others think they enrich life.\nWhich side do you agree with? Please briefly explain your thoughts.",
        boundaryCheckTwo:
          "One final boundary question.\nIf you need to explain to someone why a plan has changed and propose a new arrangement, how would you say it? Please say two or three sentences in Chinese.",
        scenario: {
          study:
            "Imagine you just arrived at school and need to tell your teacher why you were late today. Please say a short paragraph in Chinese.",
          work: "Imagine you need to confirm a task with a colleague today. Please say in Chinese how you would express it.",
          travel:
            "Imagine you are ordering food at a restaurant but the waiter says the dish you want is unavailable. What would you say?",
          fallback:
            "Please say in Chinese what you did yesterday, using complete sentences as much as possible.",
        },
        stressTestScenario: {
          study:
            "Your teacher says you must make up a material by tomorrow, but you are not ready yet. How would you explain the reason and ask for help?",
          work: "A colleague changed the plan at the last minute, and you cannot finish the task on time. How would you explain the reason and propose a solution?",
          travel:
            "The room you booked is no longer available, and the front desk offers you a more expensive room. How would you explain the situation and ask for a resolution?",
          fallback:
            "You made an appointment with a friend, but it suddenly started raining. How would you explain the situation and arrange the next step?",
        },
      },
      thinking: {
        background:
          "Analyzing native-language clues and learning motivation in the user's background.",
        dailyExpression:
          "Analyzing sentence complexity, vocabulary, and fluency.",
        stressTest:
          "Evaluating the user's grasp of causal complex sentences and narrative ability.",
        boundaryCheckOne:
          "Probing the upper limit of language ability through abstract topics and opinion expression.",
        boundaryCheckTwo:
          "Confirming adjacent HSK level boundaries and complex expression stability.",
      },
    },
    answer: {
      failed: "Failed to submit answer",
      fetchFailed: "Failed to load question",
    },
    responseMode: {
      speech: "Speech answer: (submitted)",
      handwriting: "Handwriting answer: (submitted)",
      upload: "Upload answer: (submitted)",
    },
    question: {
      number: "Question {n}",
      trueFalse: {
        true: "True",
        false: "False",
      },
      confirm: "Confirm Answer",
      submitAll: "Submit All Answers",
      fillBlank: "Enter your answer",
      blankLabel: "Blank {n}",
      readingPassage: "Reading Passage",
      subQuestion: "Question {id}",
      multiSelectHint: "(Multiple select — choose all that apply)",
      completeAll: "Please complete all questions before submitting",
      roundUnit: "R",
    },
    roles: {
      system: "System",
      question: "Question",
      batchQuestion: "This round ({count} questions)",
      feedback: "Feedback",
      coldStart: "Cold-start round {round}",
    },
    confidence: {
      progress: "Progress",
      round: "Round {current} / {max}",
      accuracy: "Accuracy",
      confidence: "Confidence",
      complete: "Evaluation complete",
    },
  },
  profile: {
    currentLevel: "Current Level",
    waitingEvaluation: "Waiting for evaluation",
    mastered: "Mastered: {items}",
    suggestedFocus: "Suggested focus: {items}",
    loadFailed: "Unable to load profile. Please check backend connection.",
    unknown: "Unknown",
    updatedAt: "Updated {time}",
    skills: {
      hsk: "Overall",
      vocabulary: "Vocabulary",
      grammar: "Grammar",
      reading: "Reading",
      listening: "Listening",
      speaking: "Speaking",
    },
  },
  report: {
    title: "Evaluation Report",
    subtitle: "The session has ended. Here is a summary of your performance.",
    averageScore: "Average (out of 100)",
    totalItems: "Total Questions",
    hskSuggestion: "HSK Suggestion",
    summary: "Session Summary",
    notableSentences: "Notable Sentences",
    interestAreas: "Interest Areas",
    stubbornErrors: "Stubborn Errors",
    nextFocus: "Next Focus",
    noData: "No data",
    backHome: "Back to Home",
    newSession: "Start New Evaluation",
  },
} as const;
