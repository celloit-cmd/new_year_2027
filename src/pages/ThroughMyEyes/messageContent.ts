export interface MessageContent {
  readonly eyebrow: string
  readonly heading: string
  readonly paragraphs: readonly string[]
  readonly nextLabel: string
}

/**
 * Placeholder message copy kept separate from presentation and animation logic.
 * Replace these strings when personal message copy is supplied.
 */
export const DEFAULT_MESSAGE_CONTENT: MessageContent = {
  eyebrow: 'Through My Eyes',
  heading: 'Lorem ipsum dolor sit amet',
  paragraphs: [
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer nec odio. Praesent libero. Sed cursus ante dapibus diam. Sed nisi. Nulla quis sem at nibh elementum imperdiet.',
    'Duis sagittis ipsum. Praesent mauris. Fusce nec tellus sed augue semper porta. Mauris massa. Vestibulum lacinia arcu eget nulla. Class aptent taciti sociosqu ad litora torquent per conubia nostra.',
    'Curabitur sodales ligula in libero. Sed dignissim lacinia nunc. Curabitur tortor. Pellentesque nibh. Aenean quam. In scelerisque sem at dolor. Maecenas mattis.',
  ],
  nextLabel: 'Next',
}
