import React, {
  DetailedHTMLProps,
  HTMLAttributes,
  memo,
  useState,
} from 'react';

import ReactMarkdown from 'react-markdown';
import { CodeProps, ReactMarkdownProps } from 'react-markdown/lib/ast-to-react';

import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import useStore from '@store/store';

import TickIcon from '@icon/TickIcon';
import CrossIcon from '@icon/CrossIcon';

import useSubmit from '@hooks/useSubmit';

import {
  ChatInterface,
  ContentInterface,
  ImageContentInterface,
  FileContentInterface,
  isImageContent,
  isTextContent,
  isFileContent,
} from '@type/chat';

import { codeLanguageSubset } from '@constants/chat';

import RefreshButton from './Button/RefreshButton';
import UpButton from './Button/UpButton';
import DownButton from './Button/DownButton';
import CopyButton from './Button/CopyButton';
import EditButton from './Button/EditButton';
import DeleteButton from './Button/DeleteButton';
import MarkdownModeButton from './Button/MarkdownModeButton';

import CodeBlock from '../CodeBlock';
import PopupModal from '@components/PopupModal';
import { preprocessLaTeX } from '@utils/chat';

// File icons based on file type
const getFileIcon = (fileType: string): string => {
  if (fileType.startsWith('text/plain')) return '📄';
  if (fileType.startsWith('text/markdown')) return '📝';
  if (fileType.startsWith('text/html')) return '🌐';
  if (fileType.includes('word')) return '📃';
  if (fileType.includes('spreadsheet') || fileType.includes('excel') || fileType === 'text/csv') return '📊';
  if (fileType === 'application/pdf') return '📕';
  return '📎';
};

const ContentView = memo(
  ({
    role,
    content,
    setIsEdit,
    messageIndex,
  }: {
    role: string;
    content: ContentInterface[];
    setIsEdit: React.Dispatch<React.SetStateAction<boolean>>;
    messageIndex: number;
  }) => {
    const { handleSubmit } = useSubmit();

    const [isDelete, setIsDelete] = useState<boolean>(false);
    const [zoomedImage, setZoomedImage] = useState<string | null>(null);
    const [previewFile, setPreviewFile] = useState<FileContentInterface | null>(null);

    const currentChatIndex = useStore((state) => state.currentChatIndex);
    const setChats = useStore((state) => state.setChats);
    const lastMessageIndex = useStore((state) =>
      state.chats ? state.chats[state.currentChatIndex].messages.length - 1 : 0
    );
    const inlineLatex = useStore((state) => state.inlineLatex);
    const markdownMode = useStore((state) => state.markdownMode);

    const handleDelete = () => {
      const updatedChats: ChatInterface[] = JSON.parse(
        JSON.stringify(useStore.getState().chats)
      );
      updatedChats[currentChatIndex].messages.splice(messageIndex, 1);
      setChats(updatedChats);
    };

    const handleMove = (direction: 'up' | 'down') => {
      const updatedChats: ChatInterface[] = JSON.parse(
        JSON.stringify(useStore.getState().chats)
      );
      const updatedMessages = updatedChats[currentChatIndex].messages;
      const temp = updatedMessages[messageIndex];
      if (direction === 'up') {
        updatedMessages[messageIndex] = updatedMessages[messageIndex - 1];
        updatedMessages[messageIndex - 1] = temp;
      } else {
        updatedMessages[messageIndex] = updatedMessages[messageIndex + 1];
        updatedMessages[messageIndex + 1] = temp;
      }
      setChats(updatedChats);
    };

    const handleMoveUp = () => {
      handleMove('up');
    };

    const handleMoveDown = () => {
      handleMove('down');
    };

    const handleRefresh = () => {
      const updatedChats: ChatInterface[] = JSON.parse(
        JSON.stringify(useStore.getState().chats)
      );
      const updatedMessages = updatedChats[currentChatIndex].messages;
      updatedMessages.splice(updatedMessages.length - 1, 1);
      setChats(updatedChats);
      handleSubmit();
    };
    
    const currentTextContent = isTextContent(content[0]) ? content[0].text : '';
    
    const handleCopy = () => {
      navigator.clipboard.writeText(currentTextContent);
    };

    const handleImageClick = (imageUrl: string) => {
      setZoomedImage(imageUrl);
    };

    const handleCloseZoom = () => {
      setZoomedImage(null);
    };

    const handleFileClick = (file: FileContentInterface) => {
      setPreviewFile(file);
    };

    const handleCloseFilePreview = () => {
      setPreviewFile(null);
    };

    const handleDownloadFile = () => {
      if (!previewFile) return;
      
      const { content: fileContent, name, type } = previewFile.file;
      
      // Create a download link for the file
      const link = document.createElement('a');
      link.href = fileContent;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    const validImageContents = Array.isArray(content)
      ? (content.slice(1).filter(isImageContent) as ImageContentInterface[])
      : [];
      
    const validFileContents = Array.isArray(content)
      ? (content.slice(1).filter(isFileContent) as FileContentInterface[])
      : [];

    // Function to render file preview content based on file type
    const renderFilePreview = (file: FileContentInterface) => {
      const { content: fileContent, type: fileType, name } = file.file;
      
      // Text file preview
      if (fileType.startsWith('text/')) {
        try {
          // For base64 data URLs, extract the actual base64 content
          const base64Content = fileContent.split(',')[1];
          const decodedContent = atob(base64Content);
          return (
            <div className="file-preview-content">
              <div className="file-preview-header">
                <h3>{name}</h3>
              </div>
              <div className="file-preview-body text-content">
                <pre className="whitespace-pre-wrap max-h-96 overflow-auto p-4 bg-gray-100 dark:bg-gray-800 rounded">
                  {decodedContent}
                </pre>
              </div>
            </div>
          );
        } catch (error) {
          return <div>Unable to preview this text file.</div>;
        }
      }
      
      // PDF preview
      if (fileType === 'application/pdf') {
        return (
          <div className="file-preview-content">
            <div className="file-preview-header">
              <h3>{name}</h3>
            </div>
            <div className="file-preview-body pdf-content">
              <iframe 
                src={fileContent} 
                className="w-full h-96" 
                title={`PDF Preview: ${name}`}
              />
            </div>
          </div>
        );
      }
      
      // Image preview (if it's actually an image)
      if (fileType.startsWith('image/')) {
        return (
          <div className="file-preview-content">
            <div className="file-preview-header">
              <h3>{name}</h3>
            </div>
            <div className="file-preview-body image-content">
              <img 
                src={fileContent} 
                alt={name} 
                className="max-w-full max-h-96"
              />
            </div>
          </div>
        );
      }
      
      // For other file types, show a download prompt
      return (
        <div className="file-preview-content">
          <div className="file-preview-header">
            <h3>{name}</h3>
          </div>
          <div className="file-preview-body generic-content flex flex-col items-center justify-center p-8">
            <div className="text-6xl mb-4">{getFileIcon(fileType)}</div>
            <p className="mb-4">This file type cannot be previewed directly.</p>
            <button 
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              onClick={handleDownloadFile}
            >
              Download File
            </button>
          </div>
        </div>
      );
    };
      
    return (
      <>
        <div className='markdown prose w-full md:max-w-full break-words dark:prose-invert dark share-gpt-message'>
          {markdownMode ? (
            <ReactMarkdown
              remarkPlugins={[
                remarkGfm,
                [remarkMath, { singleDollarTextMath: inlineLatex }],
              ]}
              rehypePlugins={[
                rehypeKatex,
                [
                  rehypeHighlight,
                  {
                    detect: true,
                    ignoreMissing: true,
                    subset: codeLanguageSubset,
                  },
                ],
              ]}
              linkTarget='_new'
              components={{
                code,
                p,
              }}
            >
              {inlineLatex
                ? preprocessLaTeX(currentTextContent)
                : currentTextContent}
            </ReactMarkdown>
          ) : (
            <span className='whitespace-pre-wrap'>{currentTextContent}</span>
          )}
        </div>
        
        {/* Display images */}
        {validImageContents.length > 0 && (
          <div className='flex flex-wrap gap-4 mt-4'>
            {validImageContents.map((image, index) => (
              <div key={`image-${index}`} className='image-container'>
                <img
                  src={image.image_url.url}
                  alt={`uploaded-${index}`}
                  className='h-20 cursor-pointer rounded shadow hover:shadow-md transition-shadow'
                  onClick={() => handleImageClick(image.image_url.url)}
                />
              </div>
            ))}
          </div>
        )}
        
        {/* Display file attachments */}
        {validFileContents.length > 0 && (
          <div className='flex flex-wrap gap-4 mt-4'>
            {validFileContents.map((file, index) => (
              <div 
                key={`file-${index}`} 
                className='file-container p-3 bg-gray-100 dark:bg-gray-700 rounded shadow hover:shadow-md transition-shadow cursor-pointer'
                onClick={() => handleFileClick(file)}
              >
                <div className='flex items-center'>
                  <div className='text-2xl mr-2'>{getFileIcon(file.file.type)}</div>
                  <div className='flex flex-col'>
                    <span className='font-medium text-sm truncate max-w-[150px]' title={file.file.name}>
                      {file.file.name}
                    </span>
                    <span className='text-xs text-gray-500 dark:text-gray-400'>
                      {(file.file.size / 1024).toFixed(1) === '0.0' ? '' : `${(file.file.size / 1024).toFixed(1)} KB`}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Modal for zoomed images */}
        {zoomedImage && (
          <PopupModal
            title=''
            setIsModalOpen={handleCloseZoom}
            handleConfirm={handleCloseZoom}
            cancelButton={false}
          >
            <div className='flex justify-center'>
              <img
                src={zoomedImage}
                alt='Zoomed'
                className='max-w-full max-h-full'
              />
            </div>
          </PopupModal>
        )}
        
        {/* Modal for file previews */}
        {previewFile && (
          <PopupModal
            title={previewFile.file.name}
            setIsModalOpen={handleCloseFilePreview}
            handleConfirm={handleCloseFilePreview}
            cancelButton={false}
          >
            <div className='flex justify-center'>
              {renderFilePreview(previewFile)}
            </div>
          </PopupModal>
        )}
        
        <div className='flex justify-end gap-2 w-full mt-2'>
          {isDelete || (
            <>
              {!useStore.getState().generating &&
                role === 'assistant' &&
                messageIndex === lastMessageIndex && (
                  <RefreshButton onClick={handleRefresh} />
                )}
              {messageIndex !== 0 && <UpButton onClick={handleMoveUp} />}
              {messageIndex !== lastMessageIndex && (
                <DownButton onClick={handleMoveDown} />
              )}

              <MarkdownModeButton />
              <CopyButton onClick={handleCopy} />
              <EditButton setIsEdit={setIsEdit} />
              <DeleteButton setIsDelete={setIsDelete} />
            </>
          )}
          {isDelete && (
            <>
              <button
                className='p-1 hover:text-white'
                aria-label='cancel'
                onClick={() => setIsDelete(false)}
              >
                <CrossIcon />
              </button>
              <button
                className='p-1 hover:text-white'
                aria-label='confirm'
                onClick={handleDelete}
              >
                <TickIcon />
              </button>
            </>
          )}
        </div>
      </>
    );
  }
);

const code = memo((props: CodeProps) => {
  const { inline, className, children } = props;
  const match = /language-(\w+)/.exec(className || '');
  const lang = match && match[1];

  if (inline) {
    return <code className={className}>{children}</code>;
  } else {
    return <CodeBlock lang={lang || 'text'} codeChildren={children} />;
  }
});

const p = memo(
  (
    props?: Omit<
      DetailedHTMLProps<
        HTMLAttributes<HTMLParagraphElement>,
        HTMLParagraphElement
      >,
      'ref'
    > &
      ReactMarkdownProps
  ) => {
    return <p className='whitespace-pre-wrap'>{props?.children}</p>;
  }
);

export default ContentView;
