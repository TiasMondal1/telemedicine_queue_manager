import { useState, useEffect } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import api from '../../services/api';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { FileText, Plus, X, Loader2, Pill } from 'lucide-react';

export default function Prescriptions() {
  const [prescriptions, setPrescriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    loadPrescriptions();
  }, []);

  const loadPrescriptions = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/prescriptions/my-prescriptions');
      setPrescriptions(data.data.prescriptions);
    } catch (error) {
      toast.error('Failed to load prescriptions');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Prescriptions</h1>
            <p className="text-gray-600 mt-1">Manage patient prescriptions</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Prescription
          </Button>
        </div>

        <Card>
          {loading ? (
            <div className="p-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
              <p className="mt-2 text-gray-600">Loading prescriptions...</p>
            </div>
          ) : prescriptions.length === 0 ? (
            <div className="p-12 text-center">
              <Pill className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No prescriptions yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {prescriptions.map((prescription: any) => (
                <div key={prescription.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <FileText className="h-5 w-5 text-blue-600" />
                        <h3 className="font-semibold text-gray-900">
                          {prescription.patientFirstName} {prescription.patientLastName}
                        </h3>
                      </div>
                      
                      {prescription.diagnosis && (
                        <p className="text-sm text-gray-700 mb-2">
                          <strong>Diagnosis:</strong> {prescription.diagnosis}
                        </p>
                      )}
                      
                      <p className="text-sm text-gray-700 mb-2">
                        <strong>Medications:</strong> {prescription.medications}
                      </p>
                      
                      {prescription.instructions && (
                        <p className="text-sm text-gray-600 mb-2">
                          <strong>Instructions:</strong> {prescription.instructions}
                        </p>
                      )}
                      
                      <p className="text-xs text-gray-500 mt-3">
                        Created: {format(new Date(prescription.createdAt), 'MMM dd, yyyy')}
                        {prescription.validUntil && (
                          <span className="ml-3">
                            Valid until: {format(new Date(prescription.validUntil), 'MMM dd, yyyy')}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {showCreateModal && (
          <CreatePrescriptionModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              loadPrescriptions();
              setShowCreateModal(false);
            }}
          />
        )}
      </div>
    </div>
  );
}

function CreatePrescriptionModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    appointmentId: '',
    medications: '',
    instructions: '',
    diagnosis: '',
    validUntil: '',
  });

  useEffect(() => {
    loadCompletedAppointments();
  }, []);

  const loadCompletedAppointments = async () => {
    try {
      const { data } = await api.get('/appointments/my-appointments?status=COMPLETED');
      setAppointments(data.data.appointments || []);
    } catch (error) {
      console.error('Failed to load appointments');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post('/prescriptions', formData);
      toast.success('Prescription created successfully');
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create prescription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Create Prescription</h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Appointment
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={formData.appointmentId}
                onChange={(e) => setFormData({ ...formData, appointmentId: e.target.value })}
                required
              >
                <option value="">Select an appointment</option>
                {appointments.map((apt: any) => (
                  <option key={apt.id} value={apt.id}>
                    {apt.patient?.user?.firstName} {apt.patient?.user?.lastName} -{' '}
                    {format(new Date(apt.scheduledDate), 'MMM dd, yyyy')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Diagnosis
              </label>
              <Input
                value={formData.diagnosis}
                onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                placeholder="Patient diagnosis"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Medications *
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={4}
                value={formData.medications}
                onChange={(e) => setFormData({ ...formData, medications: e.target.value })}
                placeholder="List medications, dosage, and frequency"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Instructions
              </label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                rows={3}
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                placeholder="Additional instructions for the patient"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valid Until
              </label>
              <Input
                type="date"
                value={formData.validUntil}
                onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
              />
            </div>

            <div className="flex gap-3 mt-6">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create Prescription'}
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
}
