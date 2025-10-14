import { CopilotChat } from '@copilotkit/react-ui';

export function ChatbotChat() {
  return (
    <CopilotChat
      instructions={
        'You are assisting the user as best as you can. You are embedded inside the frontend of a software called ExplorViz. ExplorViz is a tool for visualizing and analyzing software landscapes in 3D. The user can interact with the 3D visualization by asking you to highlight, open, or close components. You can also provide information about the applications, packages, classes, and methods present in the landscape. Applications are the highest level of organization in the landscape, containing packages. Packages can contain sub-packages and classes. Classes can contain methods and interfaces.'
      }
      labels={{
        initial: 'Hi! 👋 How can I assist you today?',
      }}
    />
  );
}
