export const QUESTIONS = [
  { key: "activity_type", text: "What type of activity was this?" },
  { key: "field_block", text: "Where were you working?" },
  { key: "notes", text: "Anything to flag?" },
] as const;

export type Exchange = { key: string; question: string; answer: string };
export function parseTranscript(text: string): Exchange[] {
  return Array.from(
    text.matchAll(
      /Question \(([^)]+)\):\s*([\s\S]*?)\s*Answer:\s*([\s\S]*?)(?=\s*Question \([^)]+\):|$)/g,
    ),
    (match) => ({
      key: match[1],
      question: match[2].trim(),
      answer: match[3].trim(),
    }),
  );
}
export function serializeTranscript(exchanges: Exchange[]) {
  return (
    "Guided voice log. " +
    exchanges
      .map(
        ({ key, question, answer }) =>
          `Question (${key}): ${question} Answer: ${answer.trim()}`,
      )
      .join(" ")
  );
}
export function speechParts(
  transcript: string,
): { text: string; role: "question" | "answer" }[] {
  const exchanges = parseTranscript(transcript);
  return exchanges.length
    ? exchanges
        .flatMap(({ question, answer }) => [
          { text: question, role: "question" as const },
          { text: answer, role: "answer" as const },
        ])
        .filter((part) => part.text.trim())
    : [{ text: transcript, role: "answer" }];
}
