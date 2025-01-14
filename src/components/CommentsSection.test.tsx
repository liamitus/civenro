import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import CommentsSection from './CommentsSection';

describe('CommentsSection', () => {
  const mockProps = {
    expanded: true,
    onChange: vi.fn(),
    comments: [],
    commentContent: '',
    setCommentContent: vi.fn(),
    handleCommentSubmit: vi.fn(),
    refreshComments: vi.fn(),
    billId: 123,
  };

  test('renders CommentsSection heading', () => {
    render(<CommentsSection {...mockProps} />);
    expect(screen.getByText(/Comments/i)).toBeInTheDocument();
  });

  test('allows typing into the comment text field', () => {
    render(<CommentsSection {...mockProps} />);
    const textField = screen.getByLabelText(/Add a comment/i);
    fireEvent.change(textField, { target: { value: 'Test comment' } });
    expect(mockProps.setCommentContent).toHaveBeenCalledWith('Test comment');
  });

  test('submits a comment', () => {
    render(<CommentsSection {...mockProps} commentContent="My new comment" />);
    const button = screen.getByRole('button', { name: /submit/i });
    fireEvent.click(button);
    expect(mockProps.handleCommentSubmit).toHaveBeenCalledTimes(1);
  });
});
