import { version } from '../../../package.json';

const VersionInfo = () => {
  return (
    <div className="fixed bottom-2 right-2 text-xs text-gray-400 dark:text-gray-600 print:hidden">
      Version: {version}
    </div>
  );
};

export default VersionInfo;
