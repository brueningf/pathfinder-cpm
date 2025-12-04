import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

describe('Simple', () => {
    it('renders hello', () => {
        render(<div>Hello</div>);
        expect(screen.getByText('Hello')).toBeTruthy();
    });
});
