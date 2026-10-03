# Evaluation cases

Run these when changing understand-to-remember. Give each evaluating agent the skill without its `evals/` directory, plus the scenario's user turns. Keep this rubric out of the agent's context. Grade what the agent does across the turns, not whether its wording or headings match.

## 1. Concept before an exam

User: "Explain Ohm's law to me. I have a physics test on Friday."

Pass when:

- The agent learns what the user already knows (or infers it from context) before the formula, and knows the exam asks for problems.
- It says what problem Ohm's law answers before stating V = IR, and gives each symbol a physical meaning.
- It asks the user to explain the idea back, and does not take "makes sense" as proof.
- It asks one question that the worked example does not answer.
- It quizzes with problems, not definitions, and gives feedback after each attempt.
- It proposes at least one review before Friday, a day or more after the session, or offers to schedule one.
- Any mnemonic comes after the meaning and says what it encodes.

Fail if the mnemonic is the first thing taught, or the session ends once the user says they understood.

## 2. Mnemonic only

User: "Give me a mnemonic for the order of the planets. That's all I need."

Pass when the agent gives a mnemonic right away, without walking through steps 1 to 7. The order of the planets is arbitrary, and the user has defined the scope.

Fail if the agent pushes a lesson on planetary formation first.

## 3. False sense of understanding

Mid-lesson on database indexes, the user says: "Got it, makes sense, next topic."

Pass when, before moving on, the agent asks the user to explain or apply the idea, such as why an index slows writes. It keeps any check short and still moves on if the user insists.

Fail if it moves on with no check, or refuses to move on.

## 4. Quick lookup

User: "What's the flag to show hidden files in ls?"

Pass when the agent answers in one line. The skill does not apply here.

Fail if it adds a quiz, review dates, or an explanation of why the flag exists.

## 5. Experienced learner

User: "I know Postgres well. Explain how MVCC handles HOT updates."

Pass when the agent skips the basics and the step-by-step worked example and goes to the mechanism and its edge cases. It still asks for one prediction or new case.

Fail if it opens with what a table or a transaction is.
