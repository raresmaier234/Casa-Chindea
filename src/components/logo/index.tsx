import LogoImage from '@/app/assets/images/logo.png';
import Image from 'next/image';

type LogoProps = {
  maxHeight?: number;
};

const Logo = ({ maxHeight = 200 }: LogoProps) => {
  return (
      <Image
          src={LogoImage}
          alt="Casa chindea logo"
          style={{ height: maxHeight, width: 'auto', display: 'block' }}
          priority
      />
  );
};

export default Logo;