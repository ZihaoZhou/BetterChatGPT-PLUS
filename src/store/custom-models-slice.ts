import { StoreSlice } from './store';
import { initializeModels } from '@constants/modelLoader';

export interface CustomModel {
  id: string;
  name: string;
  architecture: {
    instruct_type: null;
    modality: 'text->text' | 'text+image->text';
    tokenizer: string;
  };
  context_length: number;
  per_request_limits: null;
  pricing: {
    completion: string;
    image: string;
    prompt: string;
    request: string;
  };
  top_provider: {
    context_length: number;
    is_moderated: boolean;
    max_completion_tokens: number;
  };
}

export interface CustomModelsSlice {
  customModels: CustomModel[];
  addCustomModel: (model: Omit<CustomModel, 'architecture' | 'context_length' | 'per_request_limits' | 'pricing' | 'top_provider'> & { architecture: { modality: CustomModel['architecture']['modality'] } }) => void;
  removeCustomModel: (modelId: string) => void;
}

const defaultModelValues = {
  architecture: {
    instruct_type: null,
    tokenizer: 'GPT'
  },
  context_length: 128000,
  per_request_limits: null,
  pricing: {
    completion: '0.00001',
    image: '0.003613',
    prompt: '0.0000025',
    request: '0'
  },
  top_provider: {
    context_length: 128000,
    is_moderated: true,
    max_completion_tokens: 16384
  }
};

export const createCustomModelsSlice: StoreSlice<CustomModelsSlice> = (set) => ({
  customModels: [],
  addCustomModel: (model) => {
    set((state) => {
      const newState = {
        ...state,
        customModels: [
          ...state.customModels,
          {
            ...model,
            ...defaultModelValues,
            architecture: {
              ...defaultModelValues.architecture,
              modality: model.architecture.modality
            }
          }
        ]
      };
      // Reload models after adding a new one
      initializeModels();
      return newState;
    });
  },
  removeCustomModel: (modelId) => {
    set((state) => {
      const newState = {
        ...state,
        customModels: state.customModels.filter((m) => m.id !== modelId)
      };
      // Reload models after removing one
      initializeModels();
      return newState;
    });
  }
});
