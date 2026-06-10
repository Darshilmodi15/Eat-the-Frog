import './HowItWorks.css';

const steps = [
  {
    num: '01',
    title: 'Create your account',
    description: 'Sign up in seconds. Your private workspace is ready immediately — no credit card, no setup hassle.'
  },
  {
    num: '02',
    title: 'Add your tasks',
    description: 'Capture everything on your plate. Set priorities, due dates, and descriptions to keep yourself accountable.'
  },
  {
    num: '03',
    title: 'Eat the frog first',
    description: 'Each morning, tackle your highest-priority task before anything else. Check it off and feel the momentum build.'
  }
];

export default function HowItWorks() {
  return (
    <section className="how-it-works" id="how-it-works">
      <div className="how-inner">
        <div className="how-header">
          <span className="how-label">How It Works</span>
          <h2 className="how-title">Three steps to getting<br />things done.</h2>
        </div>

        <div className="how-steps">
          {steps.map((step, i) => (
            <div className="how-step" key={i}>
              <span className="how-step-num">{step.num}</span>
              <div className="how-step-content">
                <h3 className="how-step-title">{step.title}</h3>
                <p className="how-step-desc">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
