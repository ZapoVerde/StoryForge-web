// src/utils/hash.test.ts

import { generateContentHash, getPromptCardContentForHash } from './hash';
import type { PromptCard, AiSettings, StackInstructions } from '../models';
import { defaultAiSettingsInCard, defaultStackInstructions, DEFAULT_FIRST_TURN_PROMPT_BLOCK, DEFAULT_EMIT_SKELETON_STRING } from '../data/config/promptCardDefaults';

describe('hash utilities', () => {

  // Test for generateContentHash
  it('generateContentHash should produce consistent hashes for the same input', () => {
    const str1 = 'Hello, world!';
    const str2 = 'Hello, world!';
    const str3 = 'Goodbye, world!';

    expect(generateContentHash(str1)).toBe(generateContentHash(str2));
    expect(generateContentHash(str1)).not.toBe(generateContentHash(str3));
  });

  it('generateContentHash should produce different hashes for inputs with different casing or whitespace', () => {
    const str1 = 'Test String';
    const str2 = 'test string';
    const str3 = 'TestString';
    const str4 = 'Test String ';

    expect(generateContentHash(str1)).not.toBe(generateContentHash(str2));
    expect(generateContentHash(str1)).not.toBe(generateContentHash(str3));
    expect(generateContentHash(str1)).not.toBe(generateContentHash(str4));
  });

  // Test for getPromptCardContentForHash
  it('getPromptCardContentForHash should produce consistent string for identical card content', () => {
    const card1: PromptCard = {
      id: '1', rootId: '1', parentId: null, contentHash: '', ownerId: 'user1', createdAt: 'iso', updatedAt: 'iso',
      title: 'Test Card',
      description: 'A simple card for testing.',
      prompt: 'This is the main prompt.',
      firstTurnOnlyBlock: DEFAULT_FIRST_TURN_PROMPT_BLOCK,
      stackInstructions: defaultStackInstructions,
      emitSkeleton: DEFAULT_EMIT_SKELETON_STRING,
      worldStateInit: '',
      gameRules: 'No rules.',
      aiSettings: { ...defaultAiSettingsInCard, temperature: 0.8 },
      helperAiSettings: { ...defaultAiSettingsInCard, temperature: 0.9 },
      tags: ['tagA', 'tagB'],
      isExample: false,
      isPublic: false,
      functionDefs: '{}',
    };

    const card2: PromptCard = { ...card1 }; // Create a deep copy or equivalent content
    // Ensure that order of tags doesn't affect hash string
    const card3: PromptCard = { ...card1, tags: ['tagB', 'tagA'] };

    expect(getPromptCardContentForHash(card1)).toBe(getPromptCardContentForHash(card2));
    expect(getPromptCardContentForHash(card1)).toBe(getPromptCardContentForHash(card3)); // Tags should be sorted internally
  });

  it('getPromptCardContentForHash should produce different string for different card content', () => {
    const baseCard: PromptCard = {
      id: '1', rootId: '1', parentId: null, contentHash: '', ownerId: 'user1', createdAt: 'iso', updatedAt: 'iso',
      title: 'Test Card',
      description: 'A simple card for testing.',
      prompt: 'This is the main prompt.',
      firstTurnOnlyBlock: DEFAULT_FIRST_TURN_PROMPT_BLOCK,
      stackInstructions: defaultStackInstructions,
      emitSkeleton: DEFAULT_EMIT_SKELETON_STRING,
      worldStateInit: '',
      gameRules: 'No rules.',
      aiSettings: { ...defaultAiSettingsInCard, temperature: 0.7 },
      helperAiSettings: { ...defaultAiSettingsInCard, temperature: 0.7 },
      tags: ['fantasy'],
      isExample: false,
      isPublic: false,
      functionDefs: '{}',
    };

    // Change title
    const changedTitle = { ...baseCard, title: 'New Title' };
    expect(getPromptCardContentForHash(baseCard)).not.toBe(getPromptCardContentForHash(changedTitle));

    // Change prompt
    const changedPrompt = { ...baseCard, prompt: 'A new main prompt.' };
    expect(getPromptCardContentForHash(baseCard)).not.toBe(getPromptCardContentForHash(changedPrompt));

    // Change description
    const changedDescription = { ...baseCard, description: 'Updated description.' };
    expect(getPromptCardContentForHash(baseCard)).not.toBe(getPromptCardContentForHash(changedDescription));

    // Change AI settings
    const changedAiSettings = { ...baseCard, aiSettings: { ...baseCard.aiSettings, temperature: 0.9 } };
    expect(getPromptCardContentForHash(baseCard)).not.toBe(getPromptCardContentForHash(changedAiSettings));

    // Change stack instructions (by object change)
    const changedStackInstructions = { ...baseCard, stackInstructions: { ...baseCard.stackInstructions, outputFormat: 'new_format' } };
    expect(getPromptCardContentForHash(baseCard)).not.toBe(getPromptCardContentForHash(changedStackInstructions));

    // Change tags
    const changedTags = { ...baseCard, tags: ['scifi'] };
    expect(getPromptCardContentForHash(baseCard)).not.toBe(getPromptCardContentForHash(changedTags));
  });

  it('getPromptCardContentForHash should handle null/empty strings consistently', () => {
    const cardWithNulls: PromptCard = {
      id: '1', rootId: '1', parentId: null, contentHash: '', ownerId: 'user1', createdAt: 'iso', updatedAt: 'iso',
      title: 'Empty Card',
      description: null, // Null description
      prompt: '', // Empty prompt
      firstTurnOnlyBlock: '', // Empty first turn block
      stackInstructions: defaultStackInstructions,
      emitSkeleton: '',
      worldStateInit: '',
      gameRules: '',
      aiSettings: defaultAiSettingsInCard,
      helperAiSettings: defaultAiSettingsInCard,
      tags: [], // Empty tags array
      isExample: false,
      isPublic: false,
      functionDefs: '',
    };

    const cardWithEmptyStrings: PromptCard = {
      id: '2', rootId: '2', parentId: null, contentHash: '', ownerId: 'user1', createdAt: 'iso', updatedAt: 'iso',
      title: 'Empty Card',
      description: '', // Empty string description
      prompt: '',
      firstTurnOnlyBlock: '',
      stackInstructions: defaultStackInstructions,
      emitSkeleton: '',
      worldStateInit: '',
      gameRules: '',
      aiSettings: defaultAiSettingsInCard,
      helperAiSettings: defaultAiSettingsInCard,
      tags: [],
      isExample: false,
      isPublic: false,
      functionDefs: '',
    };

    // Should produce the same content hash string
    expect(getPromptCardContentForHash(cardWithNulls)).toBe(getPromptCardContentForHash(cardWithEmptyStrings));
  });
});