import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import useStore from '@store/store';

import PopupModal from '@components/PopupModal';

const CustomModelsManager = () => {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newModelId, setNewModelId] = useState('');
  const [newModelName, setNewModelName] = useState('');
  const [newModelModality, setNewModelModality] = useState<'text->text' | 'text+image->text'>('text->text');

  const customModels = useStore((state) => state.customModels);
  const addCustomModel = useStore((state) => state.addCustomModel);
  const removeCustomModel = useStore((state) => state.removeCustomModel);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newModelId && newModelName) {
      addCustomModel({
        id: newModelId,
        name: newModelName,
        architecture: {
          modality: newModelModality
        }
      });
      setNewModelId('');
      setNewModelName('');
      setNewModelModality('text->text');
    }
  };

  return (
    <div>
      <button
        className='btn btn-neutral'
        onClick={() => setIsModalOpen(true)}
      >
        {t('Custom Models')}
      </button>

      {isModalOpen && (
        <PopupModal
          setIsModalOpen={setIsModalOpen}
          title={t('Custom Models')}
          cancelButton={true}
        >
          <div className='p-6 flex flex-col gap-4'>
            <form onSubmit={handleSubmit} className='flex flex-col gap-3'>
              <input
                type='text'
                placeholder='Model ID (e.g. custom/gpt4)'
                value={newModelId}
                onChange={(e) => setNewModelId(e.target.value)}
                className='text-black dark:text-white px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded'
              />
              <input
                type='text'
                placeholder='Model Name'
                value={newModelName}
                onChange={(e) => setNewModelName(e.target.value)}
                className='text-black dark:text-white px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded'
              />
              <select
                value={newModelModality}
                onChange={(e) => setNewModelModality(e.target.value as 'text->text' | 'text+image->text')}
                className='text-black dark:text-white px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded'
              >
                <option value='text->text'>Text Only</option>
                <option value='text+image->text'>Text + Image</option>
              </select>
              <button
                type='submit'
                className='btn btn-neutral'
              >
                Add Model
              </button>
            </form>

            <div className='mt-4'>
              <h3 className='text-lg font-semibold mb-2'>{t('Your Custom Models')}</h3>
              {customModels.length === 0 ? (
                <p className='text-gray-500'>{t('No custom models added yet')}</p>
              ) : (
                <ul className='space-y-2'>
                  {customModels.map((model) => (
                    <li key={model.id} className='flex justify-between items-center p-2 bg-gray-100 dark:bg-gray-700 rounded'>
                      <div>
                        <div className='font-medium'>{model.name}</div>
                        <div className='text-sm text-gray-500'>{model.id}</div>
                        <div className='text-xs text-gray-500'>{model.architecture.modality}</div>
                      </div>
                      <button
                        onClick={() => removeCustomModel(model.id)}
                        className='text-red-500 hover:text-red-700'
                      >
                        {t('Remove')}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </PopupModal>
      )}
    </div>
  );
};

export default CustomModelsManager;
