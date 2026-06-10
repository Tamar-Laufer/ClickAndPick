/* Vitest setup — runs once before the test files.
   - registers jest-dom matchers (toBeInTheDocument, toHaveValue, …)
   - unmounts React trees between tests so they don't leak into each other. */
import '@testing-library/jest-dom';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => cleanup());
