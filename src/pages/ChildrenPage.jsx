import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import supabase from '../services/supabase.js';
import useImageCache from '../hooks/useImageCache.jsx';
import AddChildForm from '../components/children/AddChildForm.jsx';
import { Card, Button, Badge, Table, Input, Modal, useToast, Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui';
import { motion } from 'framer-motion';
import ChildDetailView from '../components/children/ChildDetailView.jsx';
import RegistrationSuccessModal from '../components/children/RegistrationSuccessModal';
import PrintableIDCard from '../components/children/PrintableIDCard';
import { useAuth } from '../context/AuthContext.jsx';
import { mapChildToPrintableData, getPrintableIdValidation } from '../utils/childIdMapper.js';

const ChildrenPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  // New state variables
  const [selectedChild, setSelectedChild] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showPrintableID, setShowPrintableID] = useState(false);
  const [printableAutoPrint, setPrintableAutoPrint] = useState(true);
  const [showQRModal, setShowQRModal] = useState(false);
  const [registeredChildData, setRegisteredChildData] = useState(null);
  const [showToggleDialog, setShowToggleDialog] = useState(false);
  const [childToToggle, setChildToToggle] = useState(null);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportPreview, setExportPreview] = useState(null);
  const [loadingExportPreview, setLoadingExportPreview] = useState(false);
  const [generatingExport, setGeneratingExport] = useState(false);
  const [includeReprints, setIncludeReprints] = useState(true);
  const [previewDryRun, setPreviewDryRun] = useState(false);
  const [lastExportResult, setLastExportResult] = useState(null);
  
  // Sorting state
  const [sortBy, setSortBy] = useState('registration_date');
  const [sortOrder, setSortOrder] = useState('asc');
  
  // Image caching
  const { cacheImages, isInvalidImage, markInvalidImage } = useImageCache();

  // Debounce search query
  useEffect(() => {
    // Don't set timer for empty strings or when explicitly clearing
    if (searchQuery === '') {
      setDebouncedSearchQuery('');
      return;
    }
    
    setIsSearching(true);
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setIsSearching(false);
    }, 300); // 300ms delay
    
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Memoize fetchChildren to prevent unnecessary re-renders
  const fetchChildren = useCallback(async (forceFresh = false) => {
    setLoading(true);
    try {
      let query = supabase
        .from('children')
        .select(`
          *,
          age_categories(category_name),
          child_guardian(
            guardian_id,
            is_primary,
            guardians(first_name, last_name, phone_number, email)
          )
        `)
        .order(sortBy, { ascending: sortOrder === 'asc' });

      // Only apply search filter if there's actually a search query
      if (debouncedSearchQuery && debouncedSearchQuery.trim() !== '') {
        query = query.or(`first_name.ilike.%${debouncedSearchQuery}%,last_name.ilike.%${debouncedSearchQuery}%,formal_id.ilike.%${debouncedSearchQuery}%,nickname.ilike.%${debouncedSearchQuery}%`);
      }

      // Get total count for pagination - also only apply search filter if there's a query
      let countQuery = supabase
        .from('children')
        .select('*', { count: 'exact', head: true });
        
      if (debouncedSearchQuery && debouncedSearchQuery.trim() !== '') {
        countQuery = countQuery.or(`first_name.ilike.%${debouncedSearchQuery}%,last_name.ilike.%${debouncedSearchQuery}%,formal_id.ilike.%${debouncedSearchQuery}%,nickname.ilike.%${debouncedSearchQuery}%`);
      }
      
      const { count: totalCount, error: countError } = await countQuery;

      if (countError) throw countError;
      setTotalPages(Math.ceil(totalCount / itemsPerPage));
      
      // Apply pagination
      query = query.range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);
      
      const { data, error } = await query;

      if (error) {
        if (error.code === 'PGRST301') {
          // Handle unauthorized access
          throw new Error('Unauthorized access to children records');
        }
        throw error;
      }
      setChildren(data || []);
      
      // Cache all children photos
      if (data && data.length > 0) {
        const photoUrls = data
          .map(child => child.photo_url)
          .filter(url => url);
        cacheImages(photoUrls);
      }
    } catch (error) {
      console.error('Error fetching children:', error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearchQuery, itemsPerPage, sortBy, sortOrder]);

  // Reset to first page when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery]);

  // Fetch children when page or search changes
  useEffect(() => {
    fetchChildren();
  }, [fetchChildren]);

  // Auto-refresh every 30 seconds to detect changes from other devices
  useEffect(() => {
    const intervalId = setInterval(() => {
      fetchChildren(true); // Force fresh data
    }, 30000); // 30 seconds

    return () => clearInterval(intervalId);
  }, [fetchChildren]);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleAddChildSuccess = async (childData) => {
    await fetchChildren(); // Wait for fetch to complete
    
    // Set the registered child data and show success modal instead of Swal
    setRegisteredChildData(childData);
    setShowSuccessModal(true);
  };

  const calculateAge = (birthdate) => {
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  // For expensive calculations like getting guardian info
  const getPrimaryGuardian = useCallback((childGuardians) => {
    if (!childGuardians || childGuardians.length === 0) return null;
    
    const primaryGuardian = childGuardians.find(cg => cg.is_primary) || childGuardians[0];
    return primaryGuardian.guardians;
  }, []);
  
  // Handle column sorting
  const handleSort = (columnKey) => {
    if (sortBy === columnKey) {
      // Toggle sort order if clicking the same column
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new sort column with ascending order
      setSortBy(columnKey);
      setSortOrder('asc');
    }
  };
  
  // For table columns that don't need to be recreated on every render
  const columns = useMemo(() => [
    {
      header: "ID",
      accessor: "formal_id",
      cellClassName: "font-medium text-gray-900",
      cell: (row) => row.formal_id || 'N/A',
      width: "80px", // Slightly reduced
      sortable: true,
      sortKey: "formal_id"
    },
    {
      header: "Name",
      accessor: (row) => `${row.first_name} ${row.last_name}`,
      cell: (row) => (
        <div className="flex items-center gap-3">
          {row.photo_url ? (
            !isInvalidImage(row.photo_url) ? (
              <img
                src={row.photo_url}
                alt={`${row.first_name} ${row.last_name}`}
                className="h-10 w-10 rounded-full object-cover"
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  markInvalidImage(row.photo_url);
                }}
              />
            ) : (
              <div className="h-10 w-10 rounded-full bg-nextgen-blue/10 flex items-center justify-center">
                <span className="text-nextgen-blue-dark font-medium text-sm">
                  {row.first_name?.charAt(0)}{row.last_name?.charAt(0)}
                </span>
              </div>
            )
          ) : (
            <div className="h-10 w-10 rounded-full bg-nextgen-blue/10 flex items-center justify-center">
              <span className="text-nextgen-blue-dark font-medium text-sm">
                {row.first_name?.charAt(0)}{row.last_name?.charAt(0)}
              </span>
            </div>
          )}
          <div>
            <div className="font-medium text-gray-900">
              {row.first_name} {row.last_name}
            </div>
            {row.nickname && (
              <div className="text-sm text-gray-500">"{row.nickname}"</div>
            )}
          </div>
        </div>
      ),
      width: "200px", // Reduced from 300px
      sortable: true,
      sortKey: "first_name"
    },
    {
      header: "Age / Group",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <span className="text-gray-900">{calculateAge(row.birthdate)} yrs</span>
          <Badge variant="primary" size="sm">
            {row.age_categories?.category_name || 'Unknown'}
          </Badge>
        </div>
      ),
      width: "180px", // Increased width slightly to accommodate horizontal layout
      sortable: true,
      sortKey: "birthdate"
    },
    {
      header: "Guardian",
      cell: (row) => {
        const primaryGuardian = getPrimaryGuardian(row.child_guardian);
        return primaryGuardian ? (
          <div>
            <div className="text-gray-900 truncate max-w-[150px]">
              {primaryGuardian.first_name} {primaryGuardian.last_name}
            </div>
            <div className="text-gray-600 truncate max-w-[150px]">
              {primaryGuardian.phone_number || primaryGuardian.email || 'No contact'}
            </div>
          </div>
        ) : 'N/A';
      },
      width: "150px" // Combined guardian and contact
    },
    {
      header: "Status",
      cell: (row) => (
        <Badge 
          variant={row.is_active ? "success" : "danger"}
          size="sm"
        >
          {row.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
      width: "100px", // Slightly reduced
      sortable: true,
      sortKey: "is_active"
    },
    {
      header: "Actions",
      cellClassName: "text-end",
      cell: (row) => (
        <div className="flex justify-start gap-2">
          <Button
            variant="ghost"
            size="xs"
            onClick={(e) => {
              e.stopPropagation();
              handleEditChild(row);
            }}
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            }
          />
          <Button
            variant="ghost"
            size="xs"
            onClick={(e) => {
              e.stopPropagation();
              handleToggleActive(row);
            }}
            icon={
              row.is_active ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )
            }
            title={row.is_active ? 'Deactivate' : 'Reactivate'}
          />
        </div>
      ),
      width: "100px" // Slightly reduced
    }
  ], [calculateAge, getPrimaryGuardian, isInvalidImage, markInvalidImage]); // dependencies

  // Modern pagination with ellipsis (shadcn style)
  const renderPagination = () => {
    const getVisiblePages = () => {
      const delta = 2; // Number of pages to show on each side of current page
      const range = [];
      const rangeWithDots = [];

      // Always show first page
      range.push(1);

      // Add pages around current page
      for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
        range.push(i);
      }

      // Always show last page if more than 1 page
      if (totalPages > 1) {
        range.push(totalPages);
      }

      // Remove duplicates and sort
      const uniqueRange = [...new Set(range)].sort((a, b) => a - b);

      // Add ellipsis where needed
      let prev = 0;
      for (const page of uniqueRange) {
        if (page - prev === 2) {
          rangeWithDots.push(prev + 1);
        } else if (page - prev !== 1) {
          rangeWithDots.push('...');
        }
        rangeWithDots.push(page);
        prev = page;
      }

      return rangeWithDots;
    };

    return (
      <div className="flex items-center justify-between mt-4">
        <div>
          <p className="text-sm text-gray-700">
            Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
            <span className="font-medium">
              {Math.min(currentPage * itemsPerPage, (totalPages * itemsPerPage))}
            </span>{' '}
            of <span className="font-medium">{totalPages * itemsPerPage}</span> results
          </p>
        </div>
        <div className="flex items-center space-x-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-2"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Button>
          
          {getVisiblePages().map((page, index) => (
            page === '...' ? (
              <span key={`ellipsis-${index}`} className="px-3 py-2 text-nextgen-blue-dark">
                ...
              </span>
            ) : (
              <Button
                key={page}
                variant={currentPage === page ? "primary" : "outline"}
                size="sm"
                onClick={() => handlePageChange(page)}
                className="min-w-[40px] px-3 py-2"
              >
                {page}
              </Button>
            )
          ))}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-2"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Button>
        </div>
      </div>
    );
  };

  // New handler functions
  const handleViewChild = (child) => {
    setSelectedChild(child);
    setIsViewModalOpen(true);
  };

  const handleEditChild = (child) => {
    setSelectedChild(child);
    setIsEditModalOpen(true);
  };

  const handleToggleActive = (child) => {
    setChildToToggle(child);
    setShowToggleDialog(true);
  };

  const confirmToggleActive = async () => {
    if (!childToToggle) return;
    
    const isActivating = !childToToggle.is_active;
    
    try {
      const { error } = await supabase
        .from('children')
        .update({ is_active: isActivating })
        .eq('child_id', childToToggle.child_id);

      if (error) throw error;

      toast.success(
        isActivating ? 'Reactivated!' : 'Deactivated!',
        { description: `The child has been ${isActivating ? 'reactivated' : 'deactivated'}.` }
      );
      
      setShowToggleDialog(false);
      setChildToToggle(null);
      fetchChildren();
    } catch (error) {
      toast.error('Error!', {
        description: `Failed to ${isActivating ? 'reactivate' : 'deactivate'} child.`
      });
      console.error('Error deactivating child:', error);
    }
  };

  const handleEditSuccess = async () => {
    await fetchChildren(); // Wait for fetch to complete
    setIsEditModalOpen(false);
    setSelectedChild(null);
    
    // Show success message after list is refreshed
    toast.success('Updated!', {
      description: 'Child information has been updated.',
      duration: 1500
    });
  };

  // Add a function to handle printing ID card
  const handlePrintIDCard = () => {
    const validation = getPrintableIdValidation(registeredChildData);
    if (!validation.isValid) {
      toast.error('Cannot Print ID', {
        description: `Missing required info: ${validation.missingFields.join(', ')}`,
      });
      return;
    }

    setShowSuccessModal(false);
    setPrintableAutoPrint(true);
    setShowPrintableID(true);
  };

  const mapSnapshotToPrintableData = (snapshot) => {
    if (!snapshot) return null;

    const guardianName = snapshot.guardian_name || '';
    const guardianParts = guardianName.split(' ').filter(Boolean);

    return {
      formalId: snapshot.formal_id || 'N/A',
      firstName: snapshot.first_name || '',
      lastName: snapshot.last_name || '',
      nickname: snapshot.nickname || '',
      photoUrl: snapshot.photo_url || '',
      gender: snapshot.gender || 'N/A',
      ageCategory: snapshot.age_category || 'N/A',
      guardianFirstName: guardianParts[0] || 'N/A',
      guardianLastName: guardianParts.slice(1).join(' '),
      guardianPhone: snapshot.guardian_contact || 'N/A',
      guardianEmail: '',
      registrationDate: new Date().toISOString(),
    };
  };

  const openPdfFromBase64 = async (pdfBase64) => {
    if (!pdfBase64) return null;

    const raw = String(pdfBase64).trim();

    // Backward compatibility: some API responses may return comma-separated byte values.
    if (/^\d+(,\d+)+$/.test(raw)) {
      const values = raw.split(',').map((n) => Number(n.trim()));
      const valid = values.every((v) => Number.isInteger(v) && v >= 0 && v <= 255);
      if (!valid) {
        throw new Error('Invalid PDF byte payload returned from export API.');
      }
      const blob = new Blob([new Uint8Array(values)], { type: 'application/pdf' });
      return URL.createObjectURL(blob);
    }

    const withoutPrefix = raw.startsWith('data:') ? (raw.split(',')[1] || '') : raw;
    const normalized = withoutPrefix
      .replace(/\s+/g, '')
      .replace(/-/g, '+')
      .replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);

    try {
      const invalidIndex = padded.search(/[^A-Za-z0-9+/=]/);
      if (invalidIndex !== -1) {
        throw new Error(`PDF payload contains non-base64 character at index ${invalidIndex}.`);
      }

      // Decode in chunks to avoid browser atob limits on very large base64 payloads.
      const base64ChunkSize = 4 * 1024;
      const byteChunks = [];
      let totalLength = 0;

      for (let offset = 0; offset < padded.length; offset += base64ChunkSize) {
        const chunk = padded.slice(offset, offset + base64ChunkSize);
        const binary = atob(chunk);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) {
          bytes[i] = binary.charCodeAt(i);
        }
        byteChunks.push(bytes);
        totalLength += bytes.length;
      }

      const merged = new Uint8Array(totalLength);
      let writeOffset = 0;
      for (const chunk of byteChunks) {
        merged.set(chunk, writeOffset);
        writeOffset += chunk.length;
      }

      const blob = new Blob([merged], { type: 'application/pdf' });
      return URL.createObjectURL(blob);
    } catch (decodeError) {
      console.error('Invalid PDF base64 payload received from export API:', {
        error: decodeError,
        length: padded.length,
        startsWith: padded.slice(0, 24),
        endsWith: padded.slice(-24),
      });
      throw new Error('Invalid PDF payload returned from export API.');
    }
  };

  const invokeIdExport = async (payload) => {
    const useEdgeExport = import.meta.env.VITE_USE_EDGE_ID_EXPORT === 'true';

    if (useEdgeExport) {
      return supabase.functions.invoke('export-child-ids', { body: payload });
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;

    const response = await fetch('/api/children/id-export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    let data = null;
    try {
      data = responseText ? JSON.parse(responseText) : null;
    } catch {
      data = null;
    }

    if (!response.ok) {
      const timeoutMessage = response.status === 504
        ? 'Export timed out on Vercel. Please try again with fewer records or disable preview mode.'
        : null;

      return {
        data: null,
        error: new Error(
          data?.error
          || timeoutMessage
          || `ID export failed (HTTP ${response.status}).`
        ),
      };
    }

    return { data, error: null };
  };

  const handleOpenExportDialog = async () => {
    setShowExportDialog(true);
    setLastExportResult(null);
    setPreviewDryRun(false);
    setLoadingExportPreview(true);

    try {
      const { data, error } = await invokeIdExport({ mode: 'preview' });

      if (error) throw error;

      setExportPreview(data?.counts || null);
    } catch (error) {
      console.error('Failed to load export preview:', error);
      toast.error('Export Preview Failed', {
        description: 'Could not load ID export counts. Please try again.',
      });
      setShowExportDialog(false);
    } finally {
      setLoadingExportPreview(false);
    }
  };

  const handleGenerateBatchExport = async () => {
    setGeneratingExport(true);
    setLastExportResult(null);

    const loadingToastId = toast.loading(
      previewDryRun ? 'Generating Preview PDF...' : 'Exporting Child IDs...',
      {
        description: previewDryRun
          ? 'Preparing a test sheet without updating print status.'
          : 'Preparing printable ID batches. This may take a while for large exports.',
      }
    );

    try {
      const { data, error } = await invokeIdExport({
        mode: 'generate',
        includeReprints,
        dryRun: previewDryRun,
        fillPageForTest: previewDryRun,
      });

      if (error) throw error;

      setLastExportResult(data || null);

      if (data?.pdfBase64) {
        const blobUrl = await openPdfFromBase64(data.pdfBase64);
        if (blobUrl) {
          setLastExportResult((prev) => ({
            ...(prev || {}),
            ...(data || {}),
            previewPdfUrl: blobUrl,
          }));
        }
      }

      if (data?.exportedCount > 0) {
        if (previewDryRun) {
          toast.update(loadingToastId, {
            variant: 'success',
            title: 'Preview PDF Generated',
            description: `Generated a ${data.filledForPreview || data.exportedCount}-card test sheet without updating print status.`,
            duration: 5000,
          });
        } else {
          toast.update(loadingToastId, {
            variant: 'success',
            title: 'Batch Export Generated',
            description: `Exported ${data.exportedCount} child IDs successfully.`,
            duration: 5000,
          });
        }
      } else {
        toast.update(loadingToastId, {
          variant: 'info',
          title: 'No Export Needed',
          description: data?.message || 'No eligible records were available for export.',
          duration: 5000,
        });
      }

      // Refresh table because statuses can change to printed
      if (!previewDryRun) {
        fetchChildren(true);
      }
    } catch (error) {
      console.error('Failed to generate ID export:', error);
      toast.update(loadingToastId, {
        variant: 'destructive',
        title: 'Export Failed',
        description: error?.message || 'Could not generate child ID export. Please try again.',
        duration: 5000,
      });
    } finally {
      setGeneratingExport(false);
    }
  };

  return (
    <div className="page-container">
      <Card
        variant="default"
        title="Children Management"
        titleColor="text-nextgen-blue-dark"
        className="mb-6"
        animate
        icon={
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        }
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <div className="relative w-full md:w-1/2">
            <Input
              type="text"
              placeholder="Search by name, ID, or nickname..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              startIcon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              }
              endIcon={isSearching ? (
                <svg className="animate-spin h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" />
                  <path className="opacity-75" fillRule="evenodd" d="M14.243 4.757a6 6 0 10-8.486 8.486A8.962 8.962 0 0112 3a8.962 8.962 0 018.486 6.243 6 6 0 01-8.486-8.486z" clipRule="evenodd" />
                </svg>
              ) : null}
              fullWidth
            />
          </div>
          
          <div className="w-full md:w-auto flex items-center gap-2 md:justify-end">
            {user?.access_level >= 10 && (
              <Button
                variant="outline"
                onClick={handleOpenExportDialog}
                icon={
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 16v-8m0 8l-3-3m3 3l3-3M4 17a2 2 0 002 2h12a2 2 0 002-2" />
                  </svg>
                }
              >
                Export IDs
              </Button>
            )}

            <Button
              variant="primary"
              onClick={() => setIsAddModalOpen(true)}
              icon={
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
              }
            >
              Add Child
            </Button>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Table
              data={children}
              columns={columns}
              isLoading={loading}
              noDataMessage="No children found"
              highlightOnHover={true}
              variant="primary"
              stickyHeader={true}
              onRowClick={(row) => handleViewChild(row)}
              sortable={true}
              onSort={handleSort}
              sortBy={sortBy}
              sortOrder={sortOrder}
              mobileCollapsible={true}
            />
          </motion.div>
        </div>
        
        {renderPagination()}
      </Card>
      
      {/* Add Child Modal */}
      {isAddModalOpen && (
        <AddChildForm
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={handleAddChildSuccess}
        />
      )}

      {/* Edit Child Modal */}
      {isEditModalOpen && selectedChild && (
        <AddChildForm
          isEdit={true}  // Make sure this is explicitly set
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={handleEditSuccess}
          initialData={selectedChild}
        />
      )}

      {/* View Details Modal */}
      {isViewModalOpen && selectedChild && (
        <ChildDetailView
          child={selectedChild}
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsViewModalOpen(false);
            setSelectedChild(null); // Add this line to clean up
          }}
          onPrintID={() => {
            const mapped = mapChildToPrintableData(selectedChild);
            const validation = getPrintableIdValidation(mapped);
            if (!validation.isValid) {
              toast.error('Cannot Print ID', {
                description: `Missing required info: ${validation.missingFields.join(', ')}`,
              });
              return;
            }

            setIsViewModalOpen(false);
            setSelectedChild(null);
            setRegisteredChildData(mapped);
            setPrintableAutoPrint(true);
            setTimeout(() => setShowPrintableID(true), 100);
          }}
          onShowQR={() => {
            setIsViewModalOpen(false);
            setSelectedChild(null);
            setRegisteredChildData(mapChildToPrintableData(selectedChild));
            setTimeout(() => setShowQRModal(true), 100);
          }}
        />
      )}

      {/* Registration Success Modal */}
      {showSuccessModal && registeredChildData && (
        <RegistrationSuccessModal
          isOpen={showSuccessModal}
          onClose={() => setShowSuccessModal(false)}
          childData={registeredChildData}
          onPrintID={handlePrintIDCard}
        />
      )}

      {/* QR Code Modal (from Show QR button) */}
      {showQRModal && registeredChildData && (
        <RegistrationSuccessModal
          isOpen={showQRModal}
          onClose={() => setShowQRModal(false)}
          childData={registeredChildData}
          onPrintID={() => {
            const validation = getPrintableIdValidation(registeredChildData);
            if (!validation.isValid) {
              toast.error('Cannot Print ID', {
                description: `Missing required info: ${validation.missingFields.join(', ')}`,
              });
              return;
            }

            setShowQRModal(false);
            setPrintableAutoPrint(true);
            setTimeout(() => setShowPrintableID(true), 100);
          }}
        />
      )}

      {/* Printable ID Card Component */}
      {showPrintableID && registeredChildData && (
        <PrintableIDCard 
          childData={registeredChildData}
          autoPrint={printableAutoPrint}
          onClose={() => {
            setShowPrintableID(false);
            setPrintableAutoPrint(true);
          }}
        />
      )}

      {/* Deactivate/Reactivate Confirmation Dialog */}
      <Dialog open={showToggleDialog} onOpenChange={setShowToggleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Are you sure?</DialogTitle>
            <DialogDescription>
              {childToToggle && !childToToggle.is_active ? (
                "This will reactivate the child's record and they will appear in active lists."
              ) : (
                "This will deactivate the child's record. They will not appear in active lists but can be reactivated later."
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowToggleDialog(false);
                setChildToToggle(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant={childToToggle && !childToToggle.is_active ? "success" : "warning"}
              onClick={confirmToggleActive}
            >
              {childToToggle && !childToToggle.is_active ? "Yes, reactivate" : "Yes, deactivate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Export IDs Dialog (Admin only) */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Child IDs</DialogTitle>
            <DialogDescription>
              This exports printable PDF IDs in 100x70mm format. Eligible means profile-complete records currently in pending or reprint_needed status.
            </DialogDescription>
          </DialogHeader>

          {loadingExportPreview ? (
            <div className="py-4 text-sm text-gray-500 flex items-center gap-2">
              <svg className="h-4 w-4 animate-spin text-nextgen-blue" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              <span>Loading export preview</span>
            </div>
          ) : exportPreview ? (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-md bg-gray-50 p-2">Eligible: <strong>{exportPreview.eligible}</strong></div>
                <div className="rounded-md bg-gray-50 p-2">Exportable: <strong>{exportPreview.exportable}</strong></div>
                <div className="rounded-md bg-gray-50 p-2">Ready Profiles: <strong>{exportPreview.readyProfiles || 0}</strong></div>
                <div className="rounded-md bg-gray-50 p-2">Pending: <strong>{exportPreview.pending}</strong></div>
                <div className="rounded-md bg-gray-50 p-2">Reprint Needed: <strong>{exportPreview.reprintNeeded}</strong></div>
                <div className="rounded-md bg-gray-50 p-2">Printed: <strong>{exportPreview.printed}</strong></div>
                <div className="rounded-md bg-gray-50 p-2">Incomplete: <strong>{exportPreview.incomplete}</strong></div>
              </div>

              <label className="flex items-center gap-2 text-gray-700">
                <input
                  type="checkbox"
                  checked={includeReprints}
                  onChange={(e) => setIncludeReprints(e.target.checked)}
                />
                Include reprint_needed records
              </label>

              <label className="flex items-center gap-2 text-gray-700">
                <input
                  type="checkbox"
                  checked={previewDryRun}
                  onChange={(e) => setPreviewDryRun(e.target.checked)}
                />
                Preview mode: generate full test sheet, do not mark as printed
              </label>

              {(lastExportResult?.batchId || lastExportResult?.dryRun) && (
                <div className="rounded-md border border-nextgen-blue/30 bg-nextgen-blue/5 p-3">
                  <div className="font-medium text-nextgen-blue-dark">
                    {lastExportResult.dryRun ? 'Preview Created (No Status Update)' : 'Batch Created'}
                  </div>
                  {lastExportResult.batchId && (
                    <div className="text-xs text-gray-600 mt-1">Batch ID: {lastExportResult.batchId}</div>
                  )}
                  <div className="text-xs text-gray-600">Exported: {lastExportResult.exportedCount}</div>
                  {lastExportResult.cardsPerPage && (
                    <div className="text-xs text-gray-600">Cards/Page: {lastExportResult.cardsPerPage}</div>
                  )}
                  {lastExportResult.filledForPreview && (
                    <div className="text-xs text-gray-600">Preview Fill: {lastExportResult.filledForPreview}</div>
                  )}
                  {(lastExportResult.downloadUrl || lastExportResult.previewPdfUrl) && (
                    <a
                      href={lastExportResult.downloadUrl || lastExportResult.previewPdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block mt-2 text-sm text-nextgen-blue-dark underline"
                    >
                      {lastExportResult.dryRun ? 'Open Preview PDF' : 'Download PDF'}
                    </a>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="py-4 text-sm text-gray-500">No preview data available.</div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowExportDialog(false)}
              disabled={generatingExport}
            >
              Close
            </Button>
            <Button
              variant="primary"
              onClick={handleGenerateBatchExport}
              disabled={generatingExport || loadingExportPreview || !exportPreview}
              isLoading={generatingExport}
            >
              {generatingExport ? 'Generating PDF' : 'Generate PDF Export'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ChildrenPage;