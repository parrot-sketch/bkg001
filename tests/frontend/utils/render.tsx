import React, { ReactElement, ReactNode } from 'react';
import { render as rtlRender, RenderOptions } from '@testing-library/react';
import { QueryWrapper } from '../mocks/react-query';

export interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: ReturnType<typeof import('../mocks/react-query').createTestQueryClient>;
}

export function render(ui: ReactElement, options?: CustomRenderOptions) {
  const queryClient = options?.queryClient;
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryWrapper queryClient={queryClient}>{children}</QueryWrapper>
  );

  return rtlRender(ui, { wrapper: Wrapper, ...options });
}

export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';
