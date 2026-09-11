// Mocked Agent transports now traverse Gateway's credential preflight.
// No real key is needed; individual tests still own their fetch mocks.
process.env.LLM_API_KEY??='synthetic-model-test-key';
