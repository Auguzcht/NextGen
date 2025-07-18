import { Modal, Badge } from '../ui';

const ChildDetailView = ({ child, isOpen, onClose }) => {
  if (!child) return null;

  const getPrimaryGuardian = (childGuardians) => {
    if (!childGuardians || childGuardians.length === 0) return null;
    const primaryGuardian = childGuardians.find(cg => cg.is_primary) || childGuardians[0];
    return primaryGuardian.guardians;
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Child Details"
      size="xl"
    >
      <div className="grid grid-cols-3 gap-6 p-6">
        {/* Left Column - Photo */}
        <div className="col-span-1">
          {child.photo_url ? (
            <img
              src={child.photo_url}
              alt={`${child.first_name} ${child.last_name}`}
              className="w-full rounded-lg object-cover aspect-square"
            />
          ) : (
            <div className="w-full rounded-lg bg-nextgen-blue/10 aspect-square flex items-center justify-center">
              <span className="text-4xl font-medium text-nextgen-blue-dark">
                {child.first_name?.charAt(0)}{child.last_name?.charAt(0)}
              </span>
            </div>
          )}
        </div>

        {/* Right Column - Details */}
        <div className="col-span-2 space-y-6">
          <div>
            <h3 className="text-2xl font-semibold text-gray-900">
              {child.first_name} {child.middle_name} {child.last_name}
            </h3>
            <p className="text-sm text-gray-500">ID: {child.formal_id || 'N/A'}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Age</p>
              <p className="mt-1 text-gray-900">{calculateAge(child.birthdate)} years old</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Gender</p>
              <p className="mt-1 text-gray-900">{child.gender}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Age Group</p>
              <Badge variant="primary" size="sm">
                {child.age_categories?.category_name || 'Unknown'}
              </Badge>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Status</p>
              <Badge variant={child.is_active ? "success" : "danger"} size="sm">
                {child.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>

          {child.child_guardian && (
            <div>
              <h4 className="text-lg font-medium mb-2">Guardian Information</h4>
              <div className="bg-gray-50 p-4 rounded-lg">
                {getPrimaryGuardian(child.child_guardian) && (
                  <>
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">
                          {getPrimaryGuardian(child.child_guardian).first_name} {getPrimaryGuardian(child.child_guardian).last_name}
                        </p>
                        <p className="text-sm text-gray-500">{child.guardian_relationship}</p>
                      </div>
                      <Badge variant="success" size="sm">Primary</Badge>
                    </div>
                    <div className="mt-2 text-sm text-gray-600">
                      {getPrimaryGuardian(child.child_guardian).phone_number && (
                        <p className="flex items-center gap-2">
                          <span>📞</span>
                          {getPrimaryGuardian(child.child_guardian).phone_number}
                        </p>
                      )}
                      {getPrimaryGuardian(child.child_guardian).email && (
                        <p className="flex items-center gap-2">
                          <span>✉️</span>
                          {getPrimaryGuardian(child.child_guardian).email}
                        </p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ChildDetailView;