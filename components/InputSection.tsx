import React, { useState, useRef, useEffect } from 'react';
import { InputType } from '../types';
import { Link, FileText, Type, UploadCloud, X, AlertCircle, Camera, CameraIcon, RefreshCw } from 'lucide-react';

interface InputSectionProps {
  inputType: InputType;
  setInputType: (type: InputType) => void;
  inputValue: string;
  setInputValue: (val: string) => void;
  fileData: string | null;
  setFileData: (data: string | null) => void;
  fileMimeType: string | null;
  setFileMimeType: (mime: string | null) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  error: string | null;
}

const InputSection: React.FC<InputSectionProps> = ({
  inputType,
  setInputType,
  inputValue,
  setInputValue,
  fileData,
  setFileData,
  fileMimeType,
  setFileMimeType,
  onAnalyze,
  isAnalyzing,
  error
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // Stop camera when component unmounts or input type changes
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (inputType !== 'camera') {
      stopCamera();
    } else if (inputType === 'camera' && !capturedImage) {
      startCamera();
    }
  }, [inputType]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setIsCameraActive(true);
      setCapturedImage(null);
      // Clear other inputs
      setInputValue('');
      setFileData(null);
      setFileMimeType(null);
    } catch (err) {
      console.error("Error accessing camera:", err);
      // Fallback or error handling
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const imageDataUrl = canvas.toDataURL('image/jpeg');
        const base64 = imageDataUrl.split(',')[1];
        
        setCapturedImage(imageDataUrl);
        setFileData(base64);
        setFileMimeType('image/jpeg');
        setInputValue('[Camera Capture] Analysis');
        
        stopCamera();
      }
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setFileData(null);
    setFileMimeType(null);
    setInputValue('');
    startCamera();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      
      const isImage = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf';
      
      // Treat Images and PDFs as binary (base64) for the API
      if (isImage || isPdf) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            const result = ev.target?.result as string;
            // Extract base64 part
            const base64 = result.split(',')[1];
            setFileData(base64);
            setFileMimeType(file.type);
            setInputValue(`[${isImage ? 'Image' : 'Document'} Analysis] ${file.name}`);
        };
        reader.readAsDataURL(file);
      } else {
        // Try to read as text for other formats (txt, md, json, code, etc.)
        const reader = new FileReader();
        reader.onload = (ev) => {
            setInputValue(ev.target?.result as string);
            setFileData(null); 
            setFileMimeType(null);
        };
        reader.readAsText(file);
      }
    }
  };

  const clearFile = () => {
    setFileName(null);
    setInputValue('');
    setFileData(null);
    setFileMimeType(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="w-full max-w-3xl mx-auto mb-8 animate-fade-in-up">
      {/* Tabs */}
      <div className="flex flex-wrap justify-center gap-1 mb-6 bg-white/50 backdrop-blur-sm p-1 rounded-3xl w-fit mx-auto border border-gray-200 shadow-sm">
        <button
          onClick={() => setInputType('url')}
          className={`flex items-center gap-2 px-4 md:px-6 py-2 rounded-full text-sm font-medium transition-all ${
            inputType === 'url' ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:text-primary'
          }`}
        >
          <Link size={16} /> URL
        </button>
        <button
          onClick={() => setInputType('file')}
          className={`flex items-center gap-2 px-4 md:px-6 py-2 rounded-full text-sm font-medium transition-all ${
            inputType === 'file' ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:text-primary'
          }`}
        >
          <FileText size={16} /> File
        </button>
        <button
          onClick={() => setInputType('text')}
          className={`flex items-center gap-2 px-4 md:px-6 py-2 rounded-full text-sm font-medium transition-all ${
            inputType === 'text' ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:text-primary'
          }`}
        >
          <Type size={16} /> Text
        </button>
        <button
          onClick={() => setInputType('camera')}
          className={`flex items-center gap-2 px-4 md:px-6 py-2 rounded-full text-sm font-medium transition-all ${
            inputType === 'camera' ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:text-primary'
          }`}
        >
          <Camera size={16} /> Lens
        </button>
      </div>

      {/* Input Area */}
      <div className="relative bg-white rounded-2xl shadow-xl border border-gray-100 p-4 md:p-8 transition-all hover:shadow-2xl overflow-hidden">
        {inputType === 'url' && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 ml-1">Paste Website Link</label>
            <input
              type="url"
              placeholder="https://example.com/article"
              className="w-full p-4 rounded-xl bg-gray-50 border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-gray-800"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
          </div>
        )}

        {inputType === 'file' && (
          <div>
             <label className="block text-sm font-semibold text-gray-700 mb-2 ml-1">Upload Document or Image</label>
            {!fileName ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-32 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors group"
              >
                <div className="bg-blue-50 p-3 rounded-full mb-2 group-hover:scale-110 transition-transform">
                  <UploadCloud className="text-primary" size={24} />
                </div>
                <p className="text-gray-500 text-sm font-medium">Click to upload PDF, Image, or Text file</p>
                <p className="text-xs text-gray-400 mt-1">(PDF, JPG, PNG, TXT, MD, JSON)</p>
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-100 rounded-xl">
                <div className="flex items-center gap-3">
                    <FileText className="text-primary" size={20} />
                    <span className="font-medium text-gray-700 truncate max-w-[200px]">{fileName}</span>
                </div>
                <button onClick={clearFile} className="p-1 hover:bg-white rounded-full transition-colors text-gray-500 hover:text-red-500">
                    <X size={18} />
                </button>
              </div>
            )}
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".txt,.md,.json,.js,.tsx,.pdf,.docx,.pptx,image/png,image/jpeg,image/webp"
              onChange={handleFileChange}
            />
          </div>
        )}

        {inputType === 'text' && (
          <div>
             <label className="block text-sm font-semibold text-gray-700 mb-2 ml-1">Enter Text Content</label>
            <textarea
              placeholder="Paste or type your text content here..."
              className="w-full h-40 p-4 rounded-xl bg-gray-50 border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none text-gray-800"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
          </div>
        )}

        {inputType === 'camera' && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2 ml-1">
               {capturedImage ? "Photo Captured" : "Take a Photo to Analyze"}
            </label>
            <div className="relative w-full rounded-xl overflow-hidden bg-black flex items-center justify-center aspect-[4/3] md:aspect-video">
                {!capturedImage ? (
                    <>
                        <video 
                            ref={videoRef} 
                            autoPlay 
                            playsInline 
                            muted
                            className="w-full h-full object-cover"
                        />
                         <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                            <button 
                                onClick={captureImage}
                                className="w-16 h-16 rounded-full border-4 border-white bg-transparent flex items-center justify-center hover:bg-white/20 transition-all active:scale-95"
                            >
                                <div className="w-12 h-12 bg-white rounded-full"></div>
                            </button>
                        </div>
                         {/* Viewfinder overlay */}
                         <div className="absolute inset-0 pointer-events-none border-[30px] border-black/30">
                             <div className="w-full h-full border-2 border-white/50 rounded-lg relative">
                                <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg"></div>
                                <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg"></div>
                                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg"></div>
                                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg"></div>
                             </div>
                         </div>
                    </>
                ) : (
                    <div className="relative w-full h-full">
                         <img src={capturedImage} alt="Captured" className="w-full h-full object-contain" />
                         <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                            <button onClick={retakePhoto} className="flex items-center gap-2 bg-white text-gray-900 px-4 py-2 rounded-full font-bold shadow-lg">
                                <RefreshCw size={18} /> Retake
                            </button>
                         </div>
                         <button onClick={retakePhoto} className="absolute bottom-4 right-4 bg-white/20 backdrop-blur-md p-2 rounded-full text-white hover:bg-white/40 md:hidden">
                                <RefreshCw size={20} />
                         </button>
                    </div>
                )}
                <canvas ref={canvasRef} className="hidden" />
            </div>
          </div>
        )}

        {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100 flex items-start gap-2 animate-fade-in">
                <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                <span className="font-medium">{error}</span>
            </div>
        )}

        <button
            onClick={onAnalyze}
            disabled={(!inputValue && !fileData) || isAnalyzing}
            className={`w-full mt-6 py-4 rounded-xl text-white font-bold text-lg shadow-lg transition-all transform active:scale-[0.98] ${
                (!inputValue && !fileData) || isAnalyzing
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-gradient-to-r from-primary to-secondary hover:shadow-primary/30'
            }`}
        >
            {isAnalyzing ? (
                <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Analyzing...
                </span>
            ) : (
                'Analyze Content →'
            )}
        </button>
      </div>
    </div>
  );
};

export default InputSection;