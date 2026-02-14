import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../ui';
import Button from '../ui/Button';

const ProfilePicture = ({ 
  imageUrl, 
  onUploadComplete, 
  onDelete, 
  userGradient,
  initials,
  size = 'lg' // 'sm', 'md', 'lg', 'xl'
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const sizes = {
    sm: 'w-20 h-20',
    md: 'w-32 h-32',
    lg: 'w-40 h-40',
    xl: 'w-48 h-48'
  };

  const iconSizes = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
    xl: 'w-12 h-12'
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      onUploadComplete(file);
    }
  };

  const handleDelete = () => {
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    setShowDeleteDialog(false);
    onDelete();
  };

  const hasImage = imageUrl && !imageError;

  return (
    <div className="relative inline-block">
      <input
        type="file"
        id="profile-picture-upload"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <motion.div
        className={`${sizes[size]} rounded-full overflow-hidden relative cursor-pointer group`}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        whileHover={{ scale: 1.05 }}
        transition={{ duration: 0.3 }}
      >
        {/* Animated border ring */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: `conic-gradient(from 0deg, #30cee4, #60d5e8, #30cee4)`,
            padding: '3px'
          }}
          animate={{
            rotate: 360
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "linear"
          }}
        >
          <div className="w-full h-full rounded-full bg-white" />
        </motion.div>

        {/* Image or gradient with initials */}
        <div className="absolute inset-[3px] rounded-full overflow-hidden">
          <AnimatePresence mode="wait">
            {hasImage ? (
              <motion.img
                key="image"
                src={imageUrl}
                alt="Profile"
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3 }}
              />
            ) : (
              <motion.div
                key="gradient"
                className={`w-full h-full flex items-center justify-center text-white ${userGradient}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3 }}
              >
                <span className="text-4xl font-bold">
                  {initials}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Hover overlay */}
          <AnimatePresence>
            {isHovered && (
              <motion.div
                className="absolute inset-0 bg-black/40 flex items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => document.getElementById('profile-picture-upload').click()}
              >
                <svg className={`${iconSizes[size]} text-white drop-shadow-lg`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Delete button - only show when image exists */}
      {hasImage && (
        <motion.button
          type="button"
          onClick={handleDelete}
          className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-2 shadow-lg z-10"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          transition={{ duration: 0.2 }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </motion.button>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Photo?</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove your profile photo?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
            >
              Yes, remove it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProfilePicture;
