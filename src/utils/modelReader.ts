import { ModelCost } from '@type/chat';

interface ModelData {
  id: string;
  name: string;
  provider: string;
  description: string;
  pricing: {
    prompt: string;
    completion: string;
    image: string;
    request: string;
  };
  context_length: number;
  architecture: {
    modality: string;
    tokenizer: string;
    instruct_type: string | null;
  };
  top_provider: {
    context_length: number;
    max_completion_tokens: number | null;
    is_moderated: boolean;
  };
  per_request_limits: any;
  // TODO: Remove workaround once openrouter supports it;
  is_stream_supported: boolean; // custom field until better workaround or openrouter proper support
}

interface ModelsJson {
  data: ModelData[];
}

const modelsJsonUrl = 'models.json';
// const modelsJsonUrl = 'models.json';
export const loadModels = async (): Promise<{
  modelOptions: string[];
  modelMaxToken: { [key: string]: number };
  modelCost: ModelCost;
  modelTypes: { [key: string]: string };
  modelStreamSupport: { [key: string]: boolean };
  modelDisplayNames: { [key: string]: string };
  modelProviders: { [key: string]: string[] }; 
}> => {
  const response = await fetch(modelsJsonUrl);
  const modelsJson: ModelsJson = await response.json();

  const modelOptions: string[] = [];
  const modelMaxToken: { [key: string]: number } = {};
  const modelCost: ModelCost = {};
  const modelTypes: { [key: string]: string } = {};
  const modelStreamSupport: { [key: string]: boolean } = {};
  const modelDisplayNames: { [key: string]: string } = {};
  const modelProviders: { [key: string]: string[] } = {}; // Added this to group by provider

  modelsJson.data.forEach((model) => {
    const modelId = model.id.split('/').pop() as string;
    const provider = model.provider;
    
    // Initialize the provider array if it doesn't exist
    if (!modelProviders[provider]) {
      modelProviders[provider] = [];
    }
    
    // Add the model to its provider group
    modelProviders[provider].push(modelId);
    
    // Continue with the rest of your existing code
    modelOptions.push(modelId);
    modelMaxToken[modelId] = model.context_length;
    modelCost[modelId] = {
      prompt: { price: parseFloat(model.pricing.prompt), unit: 1 },
      completion: { price: parseFloat(model.pricing.completion), unit: 1 },
      image: { price: 0, unit: 1 }, // default for no image models
    };

    // TODO: Remove workaround once openrouter supports it
    if (modelId.includes('o1-')) {
      model.is_stream_supported = false;
    } else {
      model.is_stream_supported = true;
    }

    // Detect image capabilities
    if (parseFloat(model.pricing.image) > 0) {
      modelTypes[modelId] = 'image';
      modelCost[modelId].image = {
        price: parseFloat(model.pricing.image),
        unit: 1,
      };
    } else {
      modelTypes[modelId] = 'text';
    }
    modelStreamSupport[modelId] = model.is_stream_supported;
    modelDisplayNames[modelId] = modelId;
  });

  return {
    modelOptions,
    modelMaxToken,
    modelCost,
    modelTypes,
    modelStreamSupport,
    modelDisplayNames,
    modelProviders, 
  };
};

export type ModelOptions = string;
export type ModelProviders = { [key: string]: ModelOptions[] }
