
import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  const footerLinks = {
    'For Renters': [
      { name: 'How it Works', href: '#' },
      { name: 'Safety Measures', href: '#' },
      { name: 'Booking Process', href: '#' },
      { name: 'Pricing & Fees', href: '#' },
      { name: 'FAQs', href: '#' },
    ],
    'For Venue Owners': [
      { name: 'List Your Venue', href: '/list-venue' },
      { name: 'Owner Dashboard', href: '/dashboard' },
      { name: 'Pricing', href: '#' },
      { name: 'Terms for Owners', href: '#' },
      { name: 'Success Stories', href: '#' },
    ],
    'Cities': [
      { name: 'Riyadh', href: '/?city=riyadh' },
      { name: 'Jeddah', href: '/?city=jeddah' },
      { name: 'Dammam', href: '/?city=dammam' },
      { name: 'Mecca', href: '/?city=mecca' },
      { name: 'Medina', href: '/?city=medina' },
    ],
    'About': [
      { name: 'Our Story', href: '#' },
      { name: 'Careers', href: '#' },
      { name: 'Press', href: '#' },
      { name: 'Contact Us', href: '#' },
      { name: 'Privacy Policy', href: '#' },
    ],
  };
  
  return (
    <footer className="bg-findvenue-dark-bg border-t border-white/10">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-10">
          {/* Logo and Description */}
          <div className="lg:col-span-2">
            <Link to="/" className="inline-block mb-4">
              <span className="text-2xl font-bold gradient-text">Avnu</span>
            </Link>
            <p className="text-findvenue-text-muted text-sm max-w-md mb-6">
              Discover and book the perfect venue for your next event in Saudi Arabia. From weddings to corporate gatherings, we have the spaces you need.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-findvenue-text-muted hover:text-findvenue transition-colors">
                <Facebook className="w-5 h-5" />
                <span className="sr-only">Facebook</span>
              </a>
              <a href="#" className="text-findvenue-text-muted hover:text-findvenue transition-colors">
                <Twitter className="w-5 h-5" />
                <span className="sr-only">Twitter</span>
              </a>
              <a href="#" className="text-findvenue-text-muted hover:text-findvenue transition-colors">
                <Instagram className="w-5 h-5" />
                <span className="sr-only">Instagram</span>
              </a>
              <a href="#" className="text-findvenue-text-muted hover:text-findvenue transition-colors">
                <Linkedin className="w-5 h-5" />
                <span className="sr-only">LinkedIn</span>
              </a>
            </div>
          </div>
          
          {/* Footer Links */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title} className="col-span-1">
              <h3 className="font-semibold text-lg mb-4">{title}</h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.name}>
                    <Link 
                      to={link.href} 
                      className="text-findvenue-text-muted hover:text-findvenue transition-colors text-sm"
                    >
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        
        <div className="border-t border-white/10 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-findvenue-text-muted">
          <p>&copy; {currentYear} Avnu. All rights reserved.</p>
          <div className="flex mt-4 md:mt-0 space-x-6">
            <Link to="#" className="hover:text-findvenue transition-colors">
              Terms of Service
            </Link>
            <Link to="#" className="hover:text-findvenue transition-colors">
              Privacy Policy
            </Link>
            <Link to="#" className="hover:text-findvenue transition-colors">
              Cookie Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
