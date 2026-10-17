export class MatchingInputError extends Error {
  readonly code = "matching_input";

  constructor(message: string) {
    super(message);
    this.name = "MatchingInputError";
  }
}
