import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const createLeadSchema = z.object({
  name: z.string().min(1, 'Name is required').trim(),
  email: z.string().min(1, 'Email is required').email('Invalid email address').trim(),
  status: z.enum(['New', 'Contacted', 'Qualified', 'Lost']),
  source: z.enum(['Website', 'Instagram', 'Referral']),
});

type CreateLeadFormData = z.infer<typeof createLeadSchema>;

interface CreateLeadModalProps {
  onSubmit: (data: CreateLeadFormData) => Promise<void>;
  onClose: () => void;
}

const CreateLeadModal = ({ onSubmit, onClose }: CreateLeadModalProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateLeadFormData>({
    resolver: zodResolver(createLeadSchema),
    defaultValues: {
      name: '',
      email: '',
      status: 'New',
      source: 'Website',
    },
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm transition-opacity"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md animate-slide-up rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl sm:p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Add New Lead</h2>
            <p className="mt-0.5 text-sm text-gray-500">Enter the lead details below.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label htmlFor="lead-name" className="mb-1.5 block text-sm font-semibold text-gray-700">
              Name
            </label>
            <input
              id="lead-name"
              type="text"
              placeholder="John Doe"
              {...register('name')}
              className="input-field"
            />
            {errors.name && (
              <p className="mt-1.5 text-xs font-medium text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="lead-email" className="mb-1.5 block text-sm font-semibold text-gray-700">
              Email
            </label>
            <input
              id="lead-email"
              type="email"
              placeholder="john@example.com"
              {...register('email')}
              className="input-field"
            />
            {errors.email && (
              <p className="mt-1.5 text-xs font-medium text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="lead-status" className="mb-1.5 block text-sm font-semibold text-gray-700">
                Status
              </label>
              <select id="lead-status" {...register('status')} className="select-field">
                <option value="New">New</option>
                <option value="Contacted">Contacted</option>
                <option value="Qualified">Qualified</option>
                <option value="Lost">Lost</option>
              </select>
            </div>
            <div>
              <label htmlFor="lead-source" className="mb-1.5 block text-sm font-semibold text-gray-700">
                Source
              </label>
              <select id="lead-source" {...register('source')} className="select-field">
                <option value="Website">Website</option>
                <option value="Instagram">Instagram</option>
                <option value="Referral">Referral</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting} className="btn-primary">
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Creating...
                </span>
              ) : (
                'Create Lead'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateLeadModal;
