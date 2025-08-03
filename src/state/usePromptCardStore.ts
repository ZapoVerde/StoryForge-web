// src/state/usePromptCardStore.ts

import { create } from 'zustand';
import { PromptCard, NewPromptCardData, AiConnection } from '../models/index'; // Assuming index.ts exports these
import { promptCardManager } from '../logic/cardManager';
import { gameRepository } from '../data/repositories/gameRepository'; // For AI Connections

interface PromptCardState {
  promptCards: PromptCard[];
  activePromptCard: PromptCard | null;
  aiConnections: AiConnection[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchPromptCards: (userId: string) => Promise<void>;
  setActivePromptCard: (card: PromptCard) => void;
  addPromptCard: (userId: string, cardData: NewPromptCardData) => Promise<PromptCard | null>;
  updatePromptCard: (userId: string, cardId: string, updates: Partial<PromptCard>) => Promise<PromptCard | null>;
  duplicatePromptCard: (userId: string, cardId: string) => Promise<PromptCard | null>;
  deletePromptCard: (userId: string, cardId: string) => Promise<void>;
  fetchAiConnections: (userId: string) => Promise<void>;
  // Import/Export functionality will go here eventually
  importPromptCards: (userId: string, cards: NewPromptCardData[]) => Promise<PromptCard[]>;
  exportPromptCard: (userId: string, cardId: string) => Promise<PromptCard | null>;
}

export const usePromptCardStore = create<PromptCardState>((set, get) => ({
  promptCards: [],
  activePromptCard: null,
  aiConnections: [],
  isLoading: false,
  error: null,

  fetchPromptCards: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      const cards = await promptCardManager.getAllPromptCards(userId);
      set({ promptCards: cards, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      console.error("Error fetching prompt cards:", error);
    }
  },

  setActivePromptCard: (card) => {
    set({ activePromptCard: card });
  },

  addPromptCard: async (userId, cardData) => {
    set({ isLoading: true, error: null });
    try {
      const newCard = await promptCardManager.createNewPromptCard(userId, cardData);
      set((state) => ({
        promptCards: [...state.promptCards, newCard],
        isLoading: false,
      }));
      return newCard;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      console.error("Error adding prompt card:", error);
      return null;
    }
  },

  updatePromptCard: async (userId, cardId, updates) => {
    set({ isLoading: true, error: null });
    try {
      const updatedCard = await promptCardManager.updatePromptCard(userId, cardId, updates);
      if (updatedCard) {
        set((state) => ({
          promptCards: state.promptCards.map(card => card.id === updatedCard.id ? updatedCard : card),
          activePromptCard: state.activePromptCard?.id === updatedCard.id ? updatedCard : state.activePromptCard,
          isLoading: false,
        }));
      }
      return updatedCard;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      console.error("Error updating prompt card:", error);
      return null;
    }
  },

  duplicatePromptCard: async (userId, cardId) => {
    set({ isLoading: true, error: null });
    try {
      const duplicatedCard = await promptCardManager.duplicatePromptCard(userId, cardId);
      if (duplicatedCard) {
        set((state) => ({
          promptCards: [...state.promptCards, duplicatedCard],
          isLoading: false,
        }));
      }
      return duplicatedCard;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      console.error("Error duplicating prompt card:", error);
      return null;
    }
  },

  deletePromptCard: async (userId, cardId) => {
    set({ isLoading: true, error: null });
    try {
      await promptCardManager.deletePromptCard(userId, cardId);
      set((state) => ({
        promptCards: state.promptCards.filter(card => card.id !== cardId),
        activePromptCard: state.activePromptCard?.id === cardId ? null : state.activePromptCard,
        isLoading: false,
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      console.error("Error deleting prompt card:", error);
    }
  },

  fetchAiConnections: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      const connections = await gameRepository.getAiConnections(userId);
      set({ aiConnections: connections, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      console.error("Error fetching AI connections:", error);
    }
  },

  importPromptCards: async (userId, cards) => {
    set({ isLoading: true, error: null });
    try {
      const imported = await promptCardManager.importPromptCards(userId, cards);
      set((state) => ({
        promptCards: [...state.promptCards, ...imported],
        isLoading: false,
      }));
      return imported;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      console.error("Error importing prompt cards:", error);
      return [];
    }
  },

  exportPromptCard: async (userId, cardId) => {
    set({ isLoading: true, error: null });
    try {
      const exported = await promptCardManager.exportPromptCard(userId, cardId);
      set({ isLoading: false });
      return exported;
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      console.error("Error exporting prompt card:", error);
      return null;
    }
  },
}));