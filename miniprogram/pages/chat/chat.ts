import {
  getState,
  subscribe,
  clearSession,
  setResult,
  addMessage,
  setLoading,
  setWaitingAnswer,
  setError,
  setQuestions,
  setColdStart,
} from "../../modules/session-store";
import {
  endSession,
  getConfidence,
  streamQuestion,
  batchSubmitAnswer,
  streamColdStart,
  streamColdStartAnswer,
} from "../../modules/api-adapter";
import {
  buildSessionResult,
  createDefaultConfidence,
} from "../../modules/session-utils";
import { createClientId } from "../../modules/id";
import { getUserId } from "../../modules/auth-manager";
import type {
  BatchAnswerPayload,
  ChatMessage,
  ConfidenceStats,
  SessionResult,
  ThinkingStep,
  ItemData,
} from "../../types";
import { placeholderAnswerLabel } from "../../modules/response-utils";

const THROTTLE_MS = 50;

function throttleSetData(
  that: WechatMiniprogram.Page.Instance<
    Record<string, unknown>,
    Record<string, unknown>
  >,
  key: string,
  value: unknown,
  ms: number
) {
  const now = Date.now();
  const last =
    ((that as Record<string, unknown>)._tl as Record<string, number>) || {};
  if (!last[key] || now - last[key] >= ms) {
    last[key] = now;
    (that as Record<string, unknown>)._tl = last;
    that.setData({ [key]: value });
  }
}

Page({
  data: {
    sessionId: null as string | null,
    messages: [] as ChatMessage[],
    isColdStart: false,
    isWaitingAnswer: false,
    isLoading: false,
    loadingText: "正在加载...",
    error: null as string | null,
    sessionResult: null as SessionResult | null,

    userId: "",
    profileOpen: false,
    scrollTarget: "",

    userInput: "",
    confidence: createDefaultConfidence() as ConfidenceStats,
    liveThinking: [] as ThinkingStep[],
    thinkingDrawerOpen: false,
    thinkingDrawerSteps: [] as ThinkingStep[],

    showEndConfirm: false,
    showExitConfirm: false,
    autoStopAlert: "",
  },

  _unsub: null as (() => void) | null,
  _abort: { aborted: false },
  _lastReqId: "",
  _csStart: 0,
  _tl: {} as Record<string, number>,
  // This round's accumulated questions (filled incrementally by onQuestion callback)
  _currentQuestions: [] as ItemData[],
  // First question pushed timestamp (kept across stream-end alignment)
  _qPushedAt: 0,
  // The message id for the current batch question message (updated incrementally)
  _qMsgId: "",
  _busy: false,
  _ended: false,

  // ================================================================
  //  Lifecycle
  // ================================================================

  onLoad() {
    const uid = getUserId() || "";
    const s = getState();

    this.setData({
      userId: uid,
      sessionId: s.sessionId,
      messages: s.messages.slice(),
      isColdStart: s.isColdStart,
      isWaitingAnswer: s.isWaitingAnswer,
      isLoading: s.isLoading,
      error: s.error,
    });

    this._unsub = subscribe(() => {
      const s = getState();
      if (
        s.sessionResult &&
        !(this.data as Record<string, unknown>).sessionResult
      ) {
        (this.data as Record<string, unknown>).sessionResult = s.sessionResult;
        wx.redirectTo({ url: "/pages/report/report" });
        return;
      }
      const u: Record<string, unknown> = {};
      if (s.messages.length !== this.data.messages.length)
        u.messages = s.messages.slice();
      if (s.isLoading !== this.data.isLoading) u.isLoading = s.isLoading;
      if (s.isWaitingAnswer !== this.data.isWaitingAnswer)
        u.isWaitingAnswer = s.isWaitingAnswer;
      if (s.isColdStart !== this.data.isColdStart)
        u.isColdStart = s.isColdStart;
      if (s.error !== this.data.error) u.error = s.error;
      if (s.messages.length > 0) {
        u.scrollTarget = `msg-${s.messages[s.messages.length - 1].id}`;
      }
      if (Object.keys(u).length > 0) this.setData(u);
    });

    if (s.isColdStart) this.startColdStart();
    else if (s.sessionId) this.fetchNextQuestion();
  },

  onUnload() {
    this._unsub?.();
    this._abort.aborted = true;
  },

  // ================================================================
  //  Cold start
  // ================================================================

  async startColdStart() {
    if (this._busy || this._ended) return;
    this._busy = true;
    const sid = this.data.sessionId;
    if (!sid) {
      this._busy = false;
      return;
    }

    setLoading(true, "cold_start");
    this.setData({
      isLoading: true,
      loadingText: "正在准备问题...",
      liveThinking: [],
    });

    try {
      const r = await streamColdStart(sid, (s) => this.appendLiveThinking(s), {
        signal: this._abort,
      });

      if ("cold_start_complete" in r && r.cold_start_complete) {
        setColdStart(false);
        setLoading(false);
        addMessage({
          id: createClientId(),
          role: "system",
          content: "冷启动完成！开始正式评测。",
          timestamp: new Date().toISOString(),
        });
        this.setData({ liveThinking: [] });
        this._busy = false;
        this.fetchNextQuestion();
      } else if ("question" in r) {
        const steps = this.data.liveThinking.slice();
        addMessage({
          id: createClientId(),
          role: "cold_start",
          content: `[${r.label || "第 " + r.round + " 轮"}] ${r.question}`,
          cold_start_data: { round: r.round, label: r.label },
          timestamp: new Date().toISOString(),
          thinking_steps: steps.length > 0 ? steps : undefined,
        });
        setLoading(false);
        setWaitingAnswer(true);
        this._csStart = Date.now();
        this.setData({ userInput: "", liveThinking: [] });
        this._busy = false;
      }
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : "获取冷启动问题失败");
      this.setData({ liveThinking: [] });
      this._busy = false;
    }
  },

  async submitColdStartAnswer(text: string) {
    if (this._busy || this._ended) return;
    this._busy = true;
    const sid = this.data.sessionId;
    if (!sid) {
      this._busy = false;
      return;
    }

    addMessage({
      id: createClientId(),
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    });

    setWaitingAnswer(false);
    setLoading(true, "cold_start");
    this.setData({ loadingText: "正在处理...", liveThinking: [] });

    try {
      const r = await streamColdStartAnswer(
        sid,
        text,
        Math.round((Date.now() - this._csStart) / 1000),
        (s) => this.appendLiveThinking(s),
        { signal: this._abort }
      );

      const steps = this.data.liveThinking.slice();
      addMessage({
        id: createClientId(),
        role: "feedback",
        content: r.feedback || "答案已记录",
        timestamp: new Date().toISOString(),
        thinking_steps: steps.length > 0 ? steps : undefined,
      });
      setLoading(false);
      this.setData({ liveThinking: [] });

      this._busy = false;
      if (r.cold_start_complete) {
        setColdStart(false);
        addMessage({
          id: createClientId(),
          role: "system",
          content: "冷启动完成！开始正式评测。",
          timestamp: new Date().toISOString(),
        });
        this.fetchNextQuestion();
      } else {
        this.startColdStart();
      }
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : "提交答案失败");
      this.setData({ liveThinking: [] });
      this._busy = false;
    }
  },

  // ================================================================
  //  Formal question
  // ================================================================

  async fetchNextQuestion(reqId?: string) {
    if (this._busy || this._ended) return;
    this._busy = true;
    const sid = this.data.sessionId;
    if (!sid) {
      this._busy = false;
      return;
    }

    const rid = reqId || createClientId();
    this._lastReqId = rid;

    // Clear stale state from previous round
    this._currentQuestions = [];
    this._qPushedAt = 0;
    this._qMsgId = "";

    setLoading(true, "generating");
    setError(null);
    this.setData({
      loadingText: "正在生成题目，请稍候...",
      liveThinking: [],
      error: null,
    });

    const _showQuestions = (questions: ItemData[]) => {
      if (questions.length === 0) return;
      if (!this._qMsgId) {
        this._qMsgId = createClientId();
        addMessage({
          id: this._qMsgId,
          role: "question",
          content: `第 ${questions.length} 道题目`,
          batch_questions: [...questions],
          timestamp: new Date().toISOString(),
          thinking_steps:
            this.data.liveThinking.length > 0
              ? [...this.data.liveThinking]
              : undefined,
        });
      } else {
        const s = getState();
        const msg = s.messages.find((m) => m.id === this._qMsgId);
        if (msg) {
          msg.batch_questions = [...questions];
          if (this.data.liveThinking.length > 0) {
            msg.thinking_steps = [...this.data.liveThinking];
          }
        }
      }
      this._currentQuestions = [...questions];
      setQuestions(questions);
      setWaitingAnswer(true);
      setLoading(false);
      this._qPushedAt = this._qPushedAt || Date.now();
      this.setData({
        messages: getState().messages.slice(),
        isWaitingAnswer: true,
        isLoading: false,
      });
    };

    try {
      const r = await streamQuestion(sid, (s) => this.appendLiveThinking(s), {
        signal: this._abort,
        requestId: rid,
        onQuestion: (q: ItemData) => {
          this._currentQuestions.push(q);
          _showQuestions(this._currentQuestions);
        },
      });

      const questions = r.questions;

      if (questions.length > 0) {
        _showQuestions(questions);
      } else {
        setLoading(false);
        addMessage({
          id: createClientId(),
          role: "question",
          content: "题目生成异常",
          timestamp: new Date().toISOString(),
        });
        setWaitingAnswer(false);
        this.setData({
          messages: getState().messages.slice(),
          isLoading: false,
          isWaitingAnswer: false,
        });
      }

      this._qPushedAt = this._qPushedAt || Date.now();
      this.setData({ liveThinking: [] });
      this._busy = false;
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : "获取题目失败");
      this.setData({ liveThinking: [] });
      this._busy = false;
    }
  },

  // ================================================================
  //  Batch answer
  // ================================================================

  async submitBatchAnswers(answers: BatchAnswerPayload[]) {
    if (this._busy || this._ended) return;
    this._busy = true;
    const sid = this.data.sessionId;
    if (!sid) {
      this._busy = false;
      return;
    }

    const subId = createClientId();
    addMessage({
      id: createClientId(),
      role: "user",
      content: answers
        .map((a) => {
          if (a.response_mode) {
            const label = placeholderAnswerLabel(a.response_mode);
            if (label) return `Q${a.question_index + 1}: ${label}`;
          }
          return `Q${a.question_index + 1}: ${a.answer}`;
        })
        .join("\n"),
      timestamp: new Date().toISOString(),
    });

    setWaitingAnswer(false);
    setLoading(true, "judging");
    this.setData({ loadingText: "正在评分，请稍候...", liveThinking: [] });

    try {
      const r = await batchSubmitAnswer(
        sid,
        answers,
        (s) => this.appendLiveThinking(s),
        { signal: this._abort, submissionId: subId }
      );

      const steps = this.data.liveThinking.slice();
      const results = r.results || [];
      for (let i = 0; i < results.length; i++) {
        const item = results[i] as Record<string, unknown>;
        addMessage({
          id: createClientId(),
          role: "feedback",
          content:
            (item.feedback as string) ||
            (item.is_correct ? "正确" : "答案已记录"),
          item_data: {
            question_type: "unknown",
            scene: "",
            grammar_focus: "",
            target_level: "",
            question_text: "",
            skill_dimension:
              item.skill_dimension as ItemData["skill_dimension"],
          },
          timestamp: new Date().toISOString(),
          thinking_steps: i === 0 && steps.length > 0 ? steps : undefined,
        });
      }

      // Accumulate dimension_rounds from the questions we generated
      const dimRounds = {
        vocabulary: this.data.confidence.dimension_rounds.vocabulary || 0,
        grammar: this.data.confidence.dimension_rounds.grammar || 0,
        reading: this.data.confidence.dimension_rounds.reading || 0,
        listening: this.data.confidence.dimension_rounds.listening || 0,
        speaking: this.data.confidence.dimension_rounds.speaking || 0,
      };
      for (const q of this._currentQuestions) {
        const dim = q.skill_dimension;
        if (
          dim === "vocabulary" ||
          dim === "grammar" ||
          dim === "reading" ||
          dim === "listening" ||
          dim === "speaking"
        ) {
          dimRounds[dim] += 1;
        }
      }

      const conf: ConfidenceStats = {
        accuracy: r.accuracy ?? 0,
        ci_lower: 0,
        ci_upper: 0,
        confidence: r.confidence ?? 0,
        sample_size: (this.data.confidence.sample_size || 0) + results.length,
        should_stop: r.auto_stop ?? false,
        stop_reason: r.stop_reason || "",
        remaining: this.data.confidence.remaining - 1,
        total_rounds: (this.data.confidence.total_rounds || 0) + 1,
        min_rounds: this.data.confidence.min_rounds || 8,
        max_rounds: this.data.confidence.max_rounds || 18,
        dimension_rounds: dimRounds,
      };

      setLoading(false);
      this.setData({ confidence: conf, liveThinking: [] });

      // Await authoritative confidence from server, then check stop
      await this.updateConfidence();

      this._busy = false;
      if (this.data.confidence.should_stop) {
        this.handleAutoStop();
      } else {
        this.fetchNextQuestion();
      }
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : "提交答案失败");
      this.setData({ liveThinking: [] });
      this._busy = false;
    }
  },

  // ================================================================
  //  Confidence & auto-stop
  // ================================================================

  handleAutoStop() {
    this.setData({
      autoStopAlert: "评测完成！系统已达到足够的置信度，即将生成报告...",
    });
    setTimeout(async () => {
      if (this._abort.aborted) return;
      await this.handleEndSession();
    }, 3000);
  },

  async updateConfidence() {
    const sid = this.data.sessionId;
    if (!sid) return;
    try {
      const serverConf = await getConfidence(sid);
      // Merge server data into local — dimension_rounds from server is authoritative
      this.setData({
        confidence: {
          ...this.data.confidence,
          accuracy: serverConf.accuracy ?? this.data.confidence.accuracy,
          confidence: serverConf.confidence ?? this.data.confidence.confidence,
          sample_size:
            serverConf.sample_size ?? this.data.confidence.sample_size,
          should_stop:
            serverConf.should_stop ?? this.data.confidence.should_stop,
          stop_reason:
            serverConf.stop_reason || this.data.confidence.stop_reason,
          remaining: serverConf.remaining ?? this.data.confidence.remaining,
          max_rounds: serverConf.max_rounds ?? this.data.confidence.max_rounds,
          dimension_rounds:
            serverConf.dimension_rounds ||
            this.data.confidence.dimension_rounds,
        },
      });
      if (serverConf.should_stop && !this.data.autoStopAlert) {
        this.handleAutoStop();
      }
    } catch {
      // Best-effort — local accumulation already provides a reasonable estimate
    }
  },

  // ================================================================
  //  End session
  // ================================================================

  async handleEndSession() {
    if (this._ended) return;
    this._ended = true;
    const sid = this.data.sessionId;
    if (!sid) return;

    setLoading(true, "judging");
    this.setData({ loadingText: "正在生成报告..." });
    try {
      const [summary, conf] = await Promise.all([
        endSession(sid),
        getConfidence(sid).catch(() => createDefaultConfidence()),
      ]);
      setResult(buildSessionResult(summary.summary, conf));
    } catch {
      setResult(
        buildSessionResult(
          {},
          this.data.confidence || createDefaultConfidence()
        )
      );
    }
    setLoading(false);
  },

  // ================================================================
  //  Live thinking
  // ================================================================

  appendLiveThinking(step: ThinkingStep) {
    const a = [...this.data.liveThinking, step];
    throttleSetData(
      this as unknown as WechatMiniprogram.Page.Instance<
        Record<string, unknown>,
        Record<string, unknown>
      >,
      "liveThinking",
      a,
      THROTTLE_MS
    );
    (this.data as Record<string, unknown>).liveThinking = a;
  },

  // ================================================================
  //  Event handlers
  // ================================================================

  onProfileToggle() {
    this.setData({ profileOpen: !this.data.profileOpen });
  },

  onBatchSubmit(e: WechatMiniprogram.CustomEvent) {
    this.submitBatchAnswers(
      (e.detail as { answers: BatchAnswerPayload[] }).answers
    );
  },

  onOpenThinking(e: WechatMiniprogram.CustomEvent) {
    this.setData({
      thinkingDrawerOpen: true,
      thinkingDrawerSteps: (e.detail as { steps: ThinkingStep[] }).steps || [],
    });
  },
  onCloseThinking() {
    this.setData({ thinkingDrawerOpen: false });
  },
  onInputChange(e: WechatMiniprogram.InputEvent) {
    this.setData({ userInput: e.detail.value });
  },

  onSendAnswer() {
    if (this._busy || this._ended) return;
    const t = this.data.userInput.trim();
    if (!t) return;
    this.setData({ userInput: "" });
    if (this.data.isColdStart) this.submitColdStartAnswer(t);
  },

  onEndTap() {
    if (!this._ended) this.setData({ showEndConfirm: true });
  },
  onExitTap() {
    this.setData({ showExitConfirm: true });
  },
  onCancelConfirm() {
    this.setData({ showEndConfirm: false, showExitConfirm: false });
  },

  async onConfirmAction() {
    if (this.data.showEndConfirm) {
      this.setData({ showEndConfirm: false });
      await this.handleEndSession();
    } else if (this.data.showExitConfirm) {
      this._abort.aborted = true;
      clearSession();
      wx.reLaunch({ url: "/pages/login/login" });
    }
  },

  onRetry() {
    setError(null);
    this.setData({ error: null });
    if (this.data.isColdStart) this.startColdStart();
    else this.fetchNextQuestion(this._lastReqId);
  },
});
