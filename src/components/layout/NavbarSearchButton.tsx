
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, MapIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const NavbarSearchButton = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/venues?search=${encodeURIComponent(searchTerm.trim())}&view=map`);
      setIsOpen(false);
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full" aria-label="Search venues">
          <Search className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <form onSubmit={handleSearch} className="flex items-center p-2 border-b border-white/10">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-findvenue-text-muted" />
            <Input
              type="text"
              placeholder="Search venues..."
              className="pl-9 bg-findvenue-surface/50 border-white/10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
            {searchTerm && (
              <button
                type="button"
                className="absolute right-2.5 top-1/2 transform -translate-y-1/2"
                onClick={() => setSearchTerm('')}
              >
                <X className="h-4 w-4 text-findvenue-text-muted hover:text-white" />
              </button>
            )}
          </div>
          <Button type="submit" className="ml-2 bg-findvenue hover:bg-findvenue-dark">
            <Search className="h-4 w-4" />
          </Button>
        </form>
        <div className="p-3 text-sm">
          <p className="text-findvenue-text-muted">Search by name, features or location</p>
          <Button 
            variant="ghost" 
            className="mt-2 text-findvenue w-full justify-start px-2"
            onClick={() => {
              navigate('/venues?view=map');
              setIsOpen(false);
            }}
          >
            <Search className="h-4 w-4 mr-2" />
            View all venues on map
          </Button>
          <Button 
            variant="ghost" 
            className="mt-1 text-findvenue w-full justify-start px-2"
            onClick={() => {
              navigate('/venues?view=map&mapTools=radius');
              setIsOpen(false);
            }}
          >
            <MapIcon className="h-4 w-4 mr-2" />
            Search venues by radius
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NavbarSearchButton;
