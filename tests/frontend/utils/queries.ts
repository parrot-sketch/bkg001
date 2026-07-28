/**
 * Custom Queries
 *
 * Commonly used queries for accessibility and component assertions.
 */

import { screen } from '@testing-library/react';

export const findByAriaLabel = (labelText: string) =>
  screen.findByLabelText(labelText);

export const findByRole = (role: string) =>
  screen.findByRole(role);
