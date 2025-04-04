import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import PopupModal from '@components/PopupModal';
import { ConfigInterface, ImageDetail } from '@type/chat';
import { modelMaxToken, modelProviders } from '@constants/modelLoader';
import { ModelOptions } from '@utils/modelReader';

// Find initial provider for the current model
export const findProviderForModel = (model: ModelOptions): string => {
  // Check in standard providers
  for (const [provider, models] of Object.entries(modelProviders)) {
    if (models.includes(model)) {
      return provider;
    }
  }
  
  // Default to first provider if not found
  return Object.keys(modelProviders)[0];
};

const ConfigMenu = ({
  setIsModalOpen,
  config,
  setConfig,
  imageDetail,
  setImageDetail,
}: {
  setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  config: ConfigInterface;
  setConfig: (config: ConfigInterface) => void;
  imageDetail: ImageDetail;
  setImageDetail: (imageDetail: ImageDetail) => void;
}) => {
  const [_maxToken, _setMaxToken] = useState<number>(config.max_tokens);
  const [_model, _setModel] = useState<ModelOptions>(config.model);
  const [_provider, _setProvider] = useState<string>(config.provider);
  const [_temperature, _setTemperature] = useState<number>(config.temperature);
  const [_presencePenalty, _setPresencePenalty] = useState<number>(
    config.presence_penalty
  );
  const [_topP, _setTopP] = useState<number>(config.top_p);
  const [_frequencyPenalty, _setFrequencyPenalty] = useState<number>(
    config.frequency_penalty
  );
  const [_imageDetail, _setImageDetail] = useState<ImageDetail>(imageDetail);
  const { t } = useTranslation('model');

  const handleConfirm = () => {
    setConfig({
      max_tokens: _maxToken,
      model: _model,
      provider: findProviderForModel(_model),
      temperature: _temperature,
      presence_penalty: _presencePenalty,
      top_p: _topP,
      frequency_penalty: _frequencyPenalty,
    });
    setImageDetail(_imageDetail);
    setIsModalOpen(false);
  };

  return (
    <PopupModal
      title={t('configuration') as string}
      setIsModalOpen={setIsModalOpen}
      handleConfirm={handleConfirm}
      handleClickBackdrop={handleConfirm}
    >
      <div className='p-6 border-b border-gray-200 dark:border-gray-600'>
        <ModelSelector
          _model={_model}
          _setModel={_setModel}
          _label={t('Model')}
        />
        <MaxTokenSlider
          _maxToken={_maxToken}
          _setMaxToken={_setMaxToken}
          _model={_model}
        />
        <TemperatureSlider
          _temperature={_temperature}
          _setTemperature={_setTemperature}
        />
        <TopPSlider _topP={_topP} _setTopP={_setTopP} />
        {/* <PresencePenaltySlider
          _presencePenalty={_presencePenalty}
          _setPresencePenalty={_setPresencePenalty}
        />
        <FrequencyPenaltySlider
          _frequencyPenalty={_frequencyPenalty}
          _setFrequencyPenalty={_setFrequencyPenalty}
        /> */}
        <ImageDetailSelector
          _imageDetail={_imageDetail}
          _setImageDetail={_setImageDetail}
        />
      </div>
    </PopupModal>
  );
};

// Add a DownChevronArrow component
const DownChevronArrow = () => (
  <svg 
    width="12" 
    height="12" 
    viewBox="0 0 24 24" 
    fill="none" 
    xmlns="http://www.w3.org/2000/svg"
    className="ml-1"
  >
    <path 
      d="M6 9L12 15L18 9" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </svg>
);

// Define the props interface
interface ModelSelectorProps {
  _model: ModelOptions;
  _setModel: React.Dispatch<React.SetStateAction<ModelOptions>>;
  _label?: string | null;
}

// Provider list - moved inside the component
export const ModelSelector: React.FC<ModelSelectorProps> = ({ 
  _model, 
  _setModel, 
  _label = 'Model' 
}) => {
  // Get providers from modelProviders each time component renders
  const providers = Object.keys(modelProviders);
  
  const [provider, setProvider] = useState(findProviderForModel(_model));
  const [model, setModel] = useState(_model);
  const [dropDownModel, setDropDownModel] = useState(false);
  const [dropDownProvider, setDropDownProvider] = useState(false);

  // Whenever the local state model changes, update the external state
  const handleModelChange = (newModel: ModelOptions) => {
    setModel(newModel);
    _setModel(newModel);
    setDropDownModel(false); // Close the dropdown
    setDropDownProvider(false);
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Only close if clicking outside of our component
      const target = event.target as Element;
      if (!target.closest('.model-selector-container')) {
        setDropDownModel(false);
        setDropDownProvider(false);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className="mb-4 model-selector-container">
      {_label && (
        <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
          {_label}
        </label>
      )}
      
      <div className="flex gap-4"> 
        {/* Provider Selector */}
        <div className="relative">
          <button
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-600 dark:hover:bg-gray-700 rounded-md flex items-center gap-2 min-w-[150px] justify-between"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDropDownProvider(prev => !prev);
              setDropDownModel(false);
            }}
            aria-label="provider"
          >
            {provider}
            <DownChevronArrow />
          </button>
          
          {dropDownProvider && (
            <div
              className="absolute top-full left-0 mt-1 z-10 bg-white rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 dark:bg-gray-800 w-full min-w-[150px]"
            >
              <ul
                className="text-sm p-0 m-0"
                aria-labelledby="providerDropdown"
              >
                {providers.map(p => (
                  <li
                    className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      setProvider(p);
                      // Get the first model from this provider
                      const firstModel = modelProviders[p][0];
                      if (firstModel) {
                        handleModelChange(firstModel);
                      }
                    }}
                    key={p}
                  >
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        {/* Model Selector */}
        <div className="relative">
          <button
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-600 dark:hover:bg-gray-700 rounded-md flex items-center gap-2 min-w-[240px] justify-between"
            onClick={(e) => {
              e.stopPropagation();
              setDropDownModel(prev => !prev);
              setDropDownProvider(false);
            }}
            aria-label="Select model"
          >
            {model} <DownChevronArrow />
          </button>
          
          {dropDownModel && (
            <div
              className="absolute top-full left-0 mt-1 z-10 bg-white rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 dark:bg-gray-800 w-full min-w-[240px]"
            >
              <ul
                className="text-sm p-0 m-0"
                aria-labelledby="modelDropdown"
              >
                {modelProviders[provider]?.map(m => (
                  <li
                    className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleModelChange(m);
                    }}
                    key={m}
                  >
                    {m}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const MaxTokenSlider = ({
  _maxToken,
  _setMaxToken,
  _model,
}: {
  _maxToken: number;
  _setMaxToken: React.Dispatch<React.SetStateAction<number>>;
  _model: ModelOptions;
}) => {
  const { t } = useTranslation('model');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef &&
      inputRef.current &&
      _setMaxToken(Number(inputRef.current.value));
  }, [_model]);

  return (
    <div>
      <label className='block text-sm font-medium text-gray-900 dark:text-white'>
        {t('token.label')}: {_maxToken}
      </label>
      <input
        type='range'
        ref={inputRef}
        value={_maxToken}
        onChange={(e) => {
          _setMaxToken(Number(e.target.value));
        }}
        min={0}
        max={modelMaxToken[_model]}
        step={1}
        className='w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer'
      />
      <div className='min-w-fit text-gray-500 dark:text-gray-300 text-sm mt-2'>
        {t('token.description')}
      </div>
    </div>
  );
};

export const TemperatureSlider = ({
  _temperature,
  _setTemperature,
}: {
  _temperature: number;
  _setTemperature: React.Dispatch<React.SetStateAction<number>>;
}) => {
  const { t } = useTranslation('model');

  return (
    <div className='mt-5 pt-5 border-t border-gray-500'>
      <label className='block text-sm font-medium text-gray-900 dark:text-white'>
        {t('temperature.label')}: {_temperature}
      </label>
      <input
        id='default-range'
        type='range'
        value={_temperature}
        onChange={(e) => {
          _setTemperature(Number(e.target.value));
        }}
        min={0}
        max={2}
        step={0.1}
        className='w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer'
      />
      <div className='min-w-fit text-gray-500 dark:text-gray-300 text-sm mt-2'>
        {t('temperature.description')}
      </div>
    </div>
  );
};

export const TopPSlider = ({
  _topP,
  _setTopP,
}: {
  _topP: number;
  _setTopP: React.Dispatch<React.SetStateAction<number>>;
}) => {
  const { t } = useTranslation('model');

  return (
    <div className='mt-5 pt-5 border-t border-gray-500'>
      <label className='block text-sm font-medium text-gray-900 dark:text-white'>
        {t('topP.label')}: {_topP}
      </label>
      <input
        id='default-range'
        type='range'
        value={_topP}
        onChange={(e) => {
          _setTopP(Number(e.target.value));
        }}
        min={0}
        max={1}
        step={0.05}
        className='w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer'
      />
      <div className='min-w-fit text-gray-500 dark:text-gray-300 text-sm mt-2'>
        {t('topP.description')}
      </div>
    </div>
  );
};

export const PresencePenaltySlider = ({
  _presencePenalty,
  _setPresencePenalty,
}: {
  _presencePenalty: number;
  _setPresencePenalty: React.Dispatch<React.SetStateAction<number>>;
}) => {
  const { t } = useTranslation('model');

  return (
    <div className='mt-5 pt-5 border-t border-gray-500'>
      <label className='block text-sm font-medium text-gray-900 dark:text-white'>
        {t('presencePenalty.label')}: {_presencePenalty}
      </label>
      <input
        id='default-range'
        type='range'
        value={_presencePenalty}
        onChange={(e) => {
          _setPresencePenalty(Number(e.target.value));
        }}
        min={-2}
        max={2}
        step={0.1}
        className='w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer'
      />
      <div className='min-w-fit text-gray-500 dark:text-gray-300 text-sm mt-2'>
        {t('presencePenalty.description')}
      </div>
    </div>
  );
};

export const FrequencyPenaltySlider = ({
  _frequencyPenalty,
  _setFrequencyPenalty,
}: {
  _frequencyPenalty: number;
  _setFrequencyPenalty: React.Dispatch<React.SetStateAction<number>>;
}) => {
  const { t } = useTranslation('model');

  return (
    <div className='mt-5 pt-5 border-t border-gray-500'>
      <label className='block text-sm font-medium text-gray-900 dark:text-white'>
        {t('frequencyPenalty.label')}: {_frequencyPenalty}
      </label>
      <input
        id='default-range'
        type='range'
        value={_frequencyPenalty}
        onChange={(e) => {
          _setFrequencyPenalty(Number(e.target.value));
        }}
        min={-2}
        max={2}
        step={0.1}
        className='w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer'
      />
      <div className='min-w-fit text-gray-500 dark:text-gray-300 text-sm mt-2'>
        {t('frequencyPenalty.description')}
      </div>
    </div>
  );
};

export const ImageDetailSelector = ({
  _imageDetail,
  _setImageDetail,
}: {
  _imageDetail: ImageDetail;
  _setImageDetail: React.Dispatch<React.SetStateAction<ImageDetail>>;
}) => {
  const { t } = useTranslation('model');
  const [dropDownDetail, setDropDownDetail] = useState(false);

  // Map image detail values to their translated labels
  const getDetailLabel = (value: ImageDetail): string => {
    switch (value) {
      case 'low':
        return t('imageDetail.low');
      case 'high':
        return t('imageDetail.high');
      case 'auto':
        return t('imageDetail.auto');
      default:
        return t('imageDetail.auto');
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.image-detail-container')) {
        setDropDownDetail(false);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className='mt-5 pt-5 border-t border-gray-500 image-detail-container'>
      <label className='block text-sm font-medium text-gray-900 dark:text-white mb-2'>
        {t('imageDetail.label')}
      </label>
      
      <div className="relative">
        <button
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-600 dark:hover:bg-gray-700 rounded-md flex items-center gap-2 min-w-[150px] justify-between"
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setDropDownDetail(prev => !prev);
          }}
          aria-label="image detail"
        >
          {getDetailLabel(_imageDetail)}
          <DownChevronArrow />
        </button>
        
        {dropDownDetail && (
          <div
            className="absolute top-full left-0 mt-1 z-10 bg-white rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-100 dark:bg-gray-800 w-full min-w-[150px]"
          >
            <ul
              className="text-sm p-0 m-0"
              aria-labelledby="imageDetailDropdown"
            >
              {['low', 'high', 'auto'].map((detail) => (
                <li
                  className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 dark:hover:text-white cursor-pointer"
                  onClick={(e) => {
                    e.stopPropagation();
                    _setImageDetail(detail as ImageDetail);
                    setDropDownDetail(false);
                  }}
                  key={detail}
                >
                  {getDetailLabel(detail as ImageDetail)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConfigMenu;
