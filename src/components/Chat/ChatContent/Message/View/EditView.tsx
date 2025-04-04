import React, { memo, useEffect, useState, useRef, ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import useStore from '@store/store';

import useSubmit from '@hooks/useSubmit';

import {
  ChatInterface,
  ContentInterface,
  ImageContentInterface,
  TextContentInterface,
  FileContentInterface,
} from '@type/chat';

import PopupModal from '@components/PopupModal';
import TokenCount from '@components/TokenCount';
import CommandPrompt from '../CommandPrompt';
import { defaultModel } from '@constants/chat';
import AttachmentIcon from '@icon/AttachmentIcon';
import { ModelOptions } from '@utils/modelReader';
import { modelTypes } from '@constants/modelLoader';
import { toast } from 'react-toastify';
import { image } from 'html2canvas/dist/types/css/types/image';

// Define supported file types
const SUPPORTED_FILE_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'text/plain', 'text/markdown', 'text/html', 
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword', // .doc
  'text/csv', 
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
  'application/pdf'
];

// File extensions mapping
const FILE_EXTENSIONS: Record<string, string> = {
  'text/plain': '.txt',
  'text/markdown': '.md',
  'text/html': '.html',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/msword': '.doc',
  'text/csv': '.csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/vnd.ms-excel': '.xls',
  'application/pdf': '.pdf',
};

// File types are handled directly in the renderFilePreview function

const EditView = ({
  content: content,
  setIsEdit,
  messageIndex,
  sticky,
}: {
  content: ContentInterface[];
  setIsEdit: React.Dispatch<React.SetStateAction<boolean>>;
  messageIndex: number;
  sticky?: boolean;
}) => {
  const setCurrentChatIndex = useStore((state) => state.setCurrentChatIndex);
  const inputRole = useStore((state) => state.inputRole);
  const setChats = useStore((state) => state.setChats);
  var currentChatIndex = useStore((state) => state.currentChatIndex);
  const model = useStore((state) => {
    const isInitialised =
      state.chats &&
      state.chats.length > 0 &&
      state.currentChatIndex >= 0 &&
      state.currentChatIndex < state.chats.length;
    if (!isInitialised) {
      currentChatIndex = 0;
      setCurrentChatIndex(0);
    }
    return isInitialised
      ? state.chats![state.currentChatIndex].config.model
      : defaultModel;
  });

  const [_content, _setContent] = useState<ContentInterface[]>(content);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [imageUrl, setImageUrl] = useState<string>('');
  const textareaRef = React.createRef<HTMLTextAreaElement>();

  const { t } = useTranslation();

  const resetTextAreaHeight = () => {
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|playbook|silk/i.test(
        navigator.userAgent
      );

    if (e.key === 'Enter' && !isMobile && !e.nativeEvent.isComposing) {
      const enterToSubmit = useStore.getState().enterToSubmit;

      if (e.ctrlKey && e.shiftKey) {
        e.preventDefault();
        handleGenerate();
        resetTextAreaHeight();
      } else if (
        (enterToSubmit && !e.shiftKey) ||
        (!enterToSubmit && (e.ctrlKey || e.shiftKey))
      ) {
        if (sticky) {
          e.preventDefault();
          handleGenerate();
          resetTextAreaHeight();
        } else {
          handleSave();
        }
      }
    }
  };

  // convert blobs to base64
  const blobToBase64 = async (blob: Blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        resolve(reader.result);
      };
      reader.readAsDataURL(blob);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const updatedChats: ChatInterface[] = JSON.parse(
      JSON.stringify(useStore.getState().chats)
    );
    const chat = updatedChats[currentChatIndex];
    const files = e.target.files!;
    
    for (const file of Array.from(files)) {
      const fileType = file.type;
      
      // Check if file type is supported
      if (!SUPPORTED_FILE_TYPES.includes(fileType) && 
          !SUPPORTED_FILE_TYPES.some(type => fileType.startsWith(type.split('/')[0]))) {
        toast.error(
          t('notifications.unsupportedFileType', {
            ns: 'import',
            fileType: fileType || 'Unknown',
          }),
          { autoClose: 5000 }
        );
        continue;
      }
      
      const fileUrl = URL.createObjectURL(file);
      const base64Content = await blobToBase64(file) as string;
      
      if (fileType.startsWith('image/')) {
        // Handle image files
        const newImage: ImageContentInterface = {
          type: 'image_url',
          image_url: {
            detail: chat.imageDetail,
            url: base64Content,
          },
        };
        _setContent(prev => [...prev, newImage] as ContentInterface[]);
      } else {
        // Handle other file types
        const newFile: FileContentInterface = {
          type: 'file',
          file: {
            name: file.name,
            type: fileType,
            content: base64Content,
            size: file.size,
          },
        };
        _setContent(prev => [...prev, newFile] as ContentInterface[]);
      }
    }
  };

  const estimateFileSize = (url: string): number | null => {
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('HEAD', url, false); // Synchronous request
      xhr.send();
  
      if (xhr.status >= 200 && xhr.status < 300) {
        const size = xhr.getResponseHeader('Content-Length');
        return size ? parseInt(size, 10) : null;
      } else {
        console.error(`Failed to get file size. Status code: ${xhr.status}`);
        return null;
      }
    } catch (error) {
      console.error('Error estimating file size:', error);
      return null;
    }
  };

  const handleImageUrlChange = () => {
    if (imageUrl.trim() === '') return;
    // Support image URLs ending with common image extensions
    if (imageUrl.includes('.jpg') || imageUrl.includes('.jpeg') || imageUrl.includes('.png') || imageUrl.includes('.gif') || imageUrl.includes('.webp') || imageUrl.includes('.svg')) {
      const updatedChats: ChatInterface[] = JSON.parse(
        JSON.stringify(useStore.getState().chats)
      );
      const chat = updatedChats[currentChatIndex];
      const newImage: ImageContentInterface = {
        type: 'image_url',
        image_url: {
          detail: chat.imageDetail,
          url: imageUrl,
        },
      };
      const updatedContent = [..._content, newImage];
      _setContent(updatedContent);
      setImageUrl('');
    } else {
      const fileSize = estimateFileSize(imageUrl);
      // Treat as document
      const newFile: FileContentInterface = {
        type: 'file',
        file: {
            name: imageUrl.split('/').pop() || 'file',
            type: (() => {
              const parts = imageUrl.split('.');
              if (parts.length > 1) {
                return parts.pop() || 'application/octet-stream';
              }
              return 'application/octet-stream';
            })(),
            content: imageUrl,
            size: fileSize || 0, // Use the estimated size or default to 0
          },
        };
      const updatedContent = [..._content, newFile];
      _setContent(updatedContent);
      setImageUrl('');
      }
    }

  const handleImageDetailChange = (index: number, detail: string) => {
    const updatedContent = [..._content];
    if (updatedContent[index + 1].type === 'image_url') {
      updatedContent[index + 1].image_url.detail = detail;
    }
    _setContent(updatedContent);
  };

  const handleRemoveFile = (index: number) => {
    const updatedContent = [..._content];
    updatedContent.splice(index + 1, 1);
    _setContent(updatedContent);
  };

  const handleSave = () => {
    const hasTextContent = (_content[0] as TextContentInterface).text !== '';
    const hasAttachments = _content.length > 1;

    if (
      sticky &&
      ((!hasTextContent && !hasAttachments) || useStore.getState().generating)
    ) {
      return;
    }
    const originalChats: ChatInterface[] = JSON.parse(
      JSON.stringify(useStore.getState().chats)
    );
    const updatedChats: ChatInterface[] = JSON.parse(
      JSON.stringify(useStore.getState().chats)
    );
    const updatedMessages = updatedChats[currentChatIndex].messages;

    if (sticky) {
      updatedMessages.push({ role: inputRole, content: _content });
      _setContent([
        {
          type: 'text',
          text: '',
        } as TextContentInterface,
      ]);
      resetTextAreaHeight();
    } else {
      updatedMessages[messageIndex].content = _content;
      setIsEdit(false);
    }
    try {
      setChats(updatedChats);
    } catch (error: unknown) {
      if ((error as DOMException).name === 'QuotaExceededError') {
        setChats(originalChats);
        toast.error(
          t('notifications.quotaExceeded', {
            ns: 'import',
          }),
          { autoClose: 15000 }
        );
        // try to save text only
        const textOnlyContent = _content.filter(isTextContent);
        if (textOnlyContent.length > 0) {
          updatedMessages[messageIndex].content = textOnlyContent;
          try {
            setChats(updatedChats);
            toast.info(
              t('notifications.textSavedOnly', {
                ns: 'import',
              }),
              { autoClose: 15000 }
            );
          } catch (innerError: unknown) {
            toast.error((innerError as Error).message);
          }
        }
      } else {
        toast.error((error as Error).message);
      }
    }
  };

  const { handleSubmit } = useSubmit();
  const handleGenerate = () => {
    const hasTextContent = (_content[0] as TextContentInterface).text !== '';
    const hasAttachments = _content.length > 1;

    if (useStore.getState().generating) {
      return;
    }

    const originalChats: ChatInterface[] = JSON.parse(
      JSON.stringify(useStore.getState().chats)
    );
    const updatedChats: ChatInterface[] = JSON.parse(
      JSON.stringify(useStore.getState().chats)
    );
    const updatedMessages = updatedChats[currentChatIndex].messages;

    if (sticky) {
      if (hasTextContent || hasAttachments) {
        updatedMessages.push({ role: inputRole, content: _content });
      }
      _setContent([
        {
          type: 'text',
          text: '',
        } as TextContentInterface,
      ]);
      resetTextAreaHeight();
    } else {
      updatedMessages[messageIndex].content = _content;
      updatedChats[currentChatIndex].messages = updatedMessages.slice(
        0,
        messageIndex + 1
      );
      setIsEdit(false);
    }
    try {
      setChats(updatedChats);
    } catch (error: unknown) {
      if ((error as DOMException).name === 'QuotaExceededError') {
        setChats(originalChats);
        toast.error(
          t('notifications.quotaExceeded', {
            ns: 'import',
          }),
          { autoClose: 15000 }
        );
        // try to save text only
        const textOnlyContent = _content.filter(isTextContent);
        if (textOnlyContent.length > 0) {
          updatedMessages[messageIndex].content = textOnlyContent;
          try {
            setChats(updatedChats);
            toast.info(
              t('notifications.textSavedOnly', {
                ns: 'import',
              }),
              { autoClose: 15000 }
            );
          } catch (innerError: unknown) {
            console.log(innerError);
          }
        }
      } else {
        console.log(error);
      }
    }
    handleSubmit();
  };

  const isTextContent = (
    content: ContentInterface
  ): content is TextContentInterface => {
    return content.type === 'text';
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items;
    const updatedChats: ChatInterface[] = JSON.parse(
      JSON.stringify(useStore.getState().chats)
    );
    const chat = updatedChats[currentChatIndex];
    
    for (const item of items) {
      // Handle images from clipboard
      if (item.type.startsWith('image/')) {
        const blob = item.getAsFile();
        if (blob) {
          const base64Image = (await blobToBase64(blob)) as string;
          const newImage: ImageContentInterface = {
            type: 'image_url',
            image_url: {
              detail: chat.imageDetail,
              url: base64Image,
            },
          };
          _setContent(prev => [...prev, newImage] as ContentInterface[]);
        }
      }
      // Handle other file types from clipboard if available
      else if (SUPPORTED_FILE_TYPES.includes(item.type)) {
        const blob = item.getAsFile();
        if (blob) {
          const base64Content = (await blobToBase64(blob)) as string;
          // Use a safer approach for the file extension
          const fileExt = FILE_EXTENSIONS[item.type] || '';
          const newFile: FileContentInterface = {
            type: 'file',
            file: {
              name: blob.name || `file${fileExt}`,
              type: item.type,
              content: base64Content,
              size: blob.size,
            },
          };
          _setContent(prev => [...prev, newFile] as ContentInterface[]);
        }
      }
    }
  };

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [(_content[0] as TextContentInterface).text]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, []);

  const fileInputRef = useRef(null);
  const handleUploadButtonClick = () => {
    // Trigger the file input when the custom button is clicked
    (fileInputRef.current! as HTMLInputElement).click();
  };
  
  return (
    <div className='relative'>
      <div
        className={`w-full  ${
          sticky
            ? 'py-2 md:py-3 px-2 md:px-4 border border-black/10 bg-white dark:border-gray-900/50 dark:text-white dark:bg-gray-700 rounded-md shadow-[0_0_10px_rgba(0,0,0,0.10)] dark:shadow-[0_0_15px_rgba(0,0,0,0.10)]'
            : ''
        }`}
      >
        <div className='relative flex items-start'>
          {modelTypes[model] == 'image' && (
            <>
              <button
                className='absolute left-0 bottom-0  btn btn-secondary h-10 ml-[-1.2rem] mb-[-0.4rem]'
                onClick={handleUploadButtonClick}
                aria-label={'Upload Images'}
              >
                <div className='flex items-center justify-center gap-2'>
                  <AttachmentIcon />
                </div>
              </button>
            </>
          )}
          {/* Place the AttachmentIcon directly over the textarea */}
          <textarea
            ref={textareaRef}
            className={`m-0 resize-none rounded-lg bg-transparent overflow-y-hidden focus:ring-0 focus-visible:ring-0 leading-7 w-full placeholder:text-gray-500/40 pr-10 ${
              modelTypes[model] == 'image' ? 'pl-7' : ''
            }`} // Adjust padding-right to make space for the icon
            onChange={(e) => {
              _setContent((prev) => [
                { type: 'text', text: e.target.value },
                ...prev.slice(1),
              ]);
            }}
            value={(_content[0] as TextContentInterface).text}
            placeholder={t('submitPlaceholder') as string}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            rows={1}
          ></textarea>
        </div>
      </div>
      <EditViewButtons
        sticky={sticky}
        handleFileChange={handleFileChange}
        handleImageDetailChange={handleImageDetailChange}
        handleRemoveFile={handleRemoveFile}
        handleGenerate={handleGenerate}
        handleSave={handleSave}
        setIsModalOpen={setIsModalOpen}
        setIsEdit={setIsEdit}
        _setContent={_setContent}
        _content={_content}
        imageUrl={imageUrl}
        setImageUrl={setImageUrl}
        handleImageUrlChange={handleImageUrlChange}
        fileInputRef={fileInputRef}
        model={model}
      />
      {isModalOpen && (
        <PopupModal
          setIsModalOpen={setIsModalOpen}
          title={t('warning') as string}
          message={t('clearMessageWarning') as string}
          handleConfirm={handleGenerate}
        />
      )}
    </div>
  );
};

const EditViewButtons = memo(
  ({
    sticky = false,
    handleFileChange,
    handleImageDetailChange,
    handleRemoveFile,
    handleGenerate,
    handleSave,
    setIsModalOpen,
    setIsEdit,
    _setContent,
    _content,
    imageUrl,
    setImageUrl,
    handleImageUrlChange,
    fileInputRef,
    model,
  }: {
    sticky?: boolean;
    handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleImageDetailChange: (index: number, e: string) => void;
    handleRemoveFile: (index: number) => void;
    handleGenerate: () => void;
    handleSave: () => void;
    setIsModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
    setIsEdit: React.Dispatch<React.SetStateAction<boolean>>;
    _setContent: React.Dispatch<React.SetStateAction<ContentInterface[]>>;
    _content: ContentInterface[];
    imageUrl: string;
    setImageUrl: React.Dispatch<React.SetStateAction<string>>;
    handleImageUrlChange: () => void;
    fileInputRef: React.MutableRefObject<null>;
    model: ModelOptions;
  }) => {
    const { t } = useTranslation();
    const generating = useStore.getState().generating;
    const advancedMode = useStore((state) => state.advancedMode);

    // Function to render file previews
    const renderFilePreview = (content: ContentInterface, index: number) => {
      if (content.type === 'image_url') {
        // Handle image files
        return (
          <div key={index} className='image-container flex flex-col gap-2'>
            <img
              src={content.image_url.url}
              alt={`uploaded-${index}`}
              className='h-10'
            />
            <div className='flex flex-row gap-3'>
              <select
                onChange={(event) =>
                  handleImageDetailChange(index, event.target.value)
                }
                title='Select image resolution'
                aria-label='Select image resolution'
                defaultValue={content.image_url.detail}
                style={{ color: 'black' }}
              >
                <option value='auto'>Auto</option>
                <option value='high'>High</option>
                <option value='low'>Low</option>
              </select>
              <button
                className='close-button'
                onClick={() => handleRemoveFile(index)}
                aria-label='Remove File'
              >
                &times;
              </button>
            </div>
          </div>
        );
      } else if (content.type === 'file') {
        // Handle other file types
        const fileType = content.file.type;
        const fileName = content.file.name;
        
        // Determine icon or thumbnail based on file type
        let filePreview;
        if (fileType.startsWith('text/')) {
          filePreview = (
            <div className='file-icon text-file'>
              <span className='file-ext'>{fileName.split('.').pop()}</span>
            </div>
          );
        } else if (fileType.includes('word')) {
          filePreview = (
            <div className='file-icon word-file'>
              <span className='file-ext'>DOC</span>
            </div>
          );
        } else if (fileType.includes('sheet') || fileType.includes('excel') || fileType === 'text/csv') {
          filePreview = (
            <div className='file-icon spreadsheet-file'>
              <span className='file-ext'>XLS</span>
            </div>
          );
        } else if (fileType === 'application/pdf') {
          filePreview = (
            <div className='file-icon pdf-file'>
              <span className='file-ext'>PDF</span>
            </div>
          );
        } else {
          filePreview = (
            <div className='file-icon generic-file'>
              <span className='file-ext'>{fileName.split('.').pop()}</span>
            </div>
          );
        }
        
        return (
          <div key={index} className='file-container flex flex-col gap-2'>
            {filePreview}
            <div className='flex flex-col'>
              <span className='file-name text-xs truncate' title={fileName}>
                {fileName}
              </span>
              <div className='flex justify-between'>
                <span className='file-size text-xs'>
                  {(content.file.size / 1024).toFixed(1) === '0.0' ? '' : `${(content.file.size / 1024).toFixed(1)} KB`}
                </span>
                <button
                  className='close-button'
                  onClick={() => handleRemoveFile(index)}
                  aria-label='Remove File'
                >
                  &times;
                </button>
              </div>
            </div>
          </div>
        );
      }
      return null;
    };

    return (
      <div>
        {/* Display attachments if there are any */}
        {_content.length > 1 && (
          <div className='flex justify-center'>
            <div className='flex flex-wrap gap-5 mt-3'>
              {_content.slice(1).map((content, index) => 
                renderFilePreview(content, index)
              )}
            </div>
          </div>
        )}

        {/* Image URL input field for models that support images */}
        {modelTypes[model] == 'image' && (
          <div className='flex justify-center mt-4'>
            <input
              type='text'
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder={t('enter_image_url_placeholder') as string}
              className='input input-bordered w-full max-w-xs text-gray-800 dark:text-white p-3 border-none bg-gray-200 dark:bg-gray-600 rounded-md m-0 w-full mr-0 h-10 focus:outline-none'
            />
            <button
              className='btn btn-neutral ml-2'
              onClick={handleImageUrlChange}
              aria-label={t('add_image_url') as string}
            >
              {t('add_image_url')}
            </button>
          </div>
        )}

        {/* Hidden file input accepting all supported file types */}
        <input
          type='file'
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handleFileChange}
          multiple
          accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.txt,.md,.html,.docx,.doc,.csv,.xlsx,.xls,.pdf"
        />

        <div className='flex'>
          <div className='flex-1 text-center mt-2 flex justify-center'>
            {sticky && (
              <button
                className={`btn relative mr-2 btn-primary ${
                  generating ? 'cursor-not-allowed opacity-40' : ''
                }`}
                onClick={handleGenerate}
                aria-label={t('generate') as string}
              >
                <div className='flex items-center justify-center gap-2'>
                  {t('generate')}
                </div>
              </button>
            )}

            {sticky || (
              <button
                className='btn relative mr-2 btn-primary'
                onClick={() => {
                  !generating && setIsModalOpen(true);
                }}
              >
                <div className='flex items-center justify-center gap-2'>
                  {t('generate')}
                </div>
              </button>
            )}

            <button
              className={`btn relative mr-2 ${
                sticky
                  ? `btn-neutral ${
                      generating ? 'cursor-not-allowed opacity-40' : ''
                    }`
                  : 'btn-neutral'
              }`}
              onClick={handleSave}
              aria-label={t('save') as string}
            >
              <div className='flex items-center justify-center gap-2'>
                {t('save')}
              </div>
            </button>

            {sticky || (
              <button
                className='btn relative btn-neutral'
                onClick={() => setIsEdit(false)}
                aria-label={t('cancel') as string}
              >
                <div className='flex items-center justify-center gap-2'>
                  {t('cancel')}
                </div>
              </button>
            )}
          </div>
          {sticky && advancedMode && <TokenCount />}
          <CommandPrompt _setContent={_setContent} />
        </div>
      </div>
    );
  }
);

export default EditView;