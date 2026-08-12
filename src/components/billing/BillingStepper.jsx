import { Check } from 'lucide-react';

const steps = [
  { number: '01', label: 'Customer Details' },
  { number: '02', label: 'Medicines & Billing' },
];

export const BillingStepper = ({ activeStep }) => (
  <nav aria-label="Billing progress">
    <ol className="flex items-center gap-0">
      {steps.map((step, index) => {
        const stepNumber = index + 1;
        const isLast = index === steps.length - 1;
        const isActive = activeStep === stepNumber;
        const isCompleted = activeStep > stepNumber;

        return (
          <li key={step.label} className="flex items-center">
            <div className="flex items-center gap-2.5" aria-current={isActive ? 'step' : undefined}>
              <span
                className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-colors duration-200 motion-reduce:transition-none ${
                  isCompleted
                    ? 'bg-emerald-600 text-white'
                    : isActive
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-400 border border-slate-200'
                }`}
                aria-hidden="true"
              >
                {isCompleted ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : step.number}
              </span>
              <span className={`text-[13px] font-semibold transition-colors duration-200 motion-reduce:transition-none ${
                isActive ? 'text-slate-900' : isCompleted ? 'text-slate-600' : 'text-slate-400'
              }`}>
                {step.label}
              </span>
            </div>
            {!isLast && (
              <div className="w-10 sm:w-20 mx-3 sm:mx-4 h-px relative" aria-hidden="true">
                <span className="absolute inset-0 bg-slate-200" />
                <span className={`absolute inset-y-0 left-0 bg-emerald-500 transition-all duration-300 motion-reduce:transition-none ${isCompleted ? 'right-0' : 'right-full'}`} />
              </div>
            )}
          </li>
        );
      })}
    </ol>
  </nav>
);
