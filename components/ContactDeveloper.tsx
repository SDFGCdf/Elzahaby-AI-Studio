
import React from 'react';
import { PhoneIcon, WhatsappIcon } from './icons';

interface ContactDeveloperProps {
    isOpen: boolean;
    onClose: () => void;
}

const phoneNumber = '+201003294903';
const whatsappLink = `https://wa.me/${phoneNumber.replace('+', '')}`;
const telLink = `tel:${phoneNumber}`;

const developerInfo = {
    name: "Mohamed Elzahaby",
    title: "Expert Software Engineer & Graphics Designer",
    skills: ["React", "Python", "TypeScript", "Node.js", "Full-Stack Development", "UI/UX Design", "Graphic Design", "Video Editing"],
    description: "A passionate creator with extensive experience in building robust web applications, mobile apps, and stunning visual content. Proficient in a wide array of programming languages and design tools, dedicated to delivering high-quality, professional solutions."
};

const ContactDeveloper: React.FC<ContactDeveloperProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 transition-opacity duration-300"
            onClick={onClose}
        >
            <div 
                className="bg-gray-800 border border-yellow-400/30 rounded-lg p-6 w-full max-w-md shadow-2xl transition-all duration-300 transform origin-bottom-right animate-fade-in-up"
                onClick={(e) => e.stopPropagation()}
            >
                <h3 className="text-xl font-bold text-yellow-400">{developerInfo.name}</h3>
                <p className="text-sm text-gray-300 mb-3">{developerInfo.title}</p>
                <p className="text-sm text-gray-400 mb-4">{developerInfo.description}</p>
                <div className="flex flex-wrap gap-2 mb-4">
                    {developerInfo.skills.map(skill => (
                        <span key={skill} className="bg-gray-700 text-yellow-300 text-xs font-medium px-2.5 py-1 rounded-full">{skill}</span>
                    ))}
                </div>
                <div className="flex space-x-3">
                    <a href={telLink} className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center transition-colors">
                        <PhoneIcon className="w-5 h-5 mr-2" />
                        Call Now
                    </a>
                    <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center transition-colors">
                        <WhatsappIcon className="w-5 h-5 mr-2" />
                        WhatsApp
                    </a>
                </div>
                 <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors">
                    <svg className="w-6 h-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
            </div>
        </div>
    );
};

export default ContactDeveloper;
