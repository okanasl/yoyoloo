import { AnimatedButton } from "@/components/ui/animated-button";
import { BlurredCircle } from "@/components/ui/blurred-circle";
import { Logo } from "@/components/ui/logo";

export default function Home() {
    return  (
        <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-4 sm:px-6 lg:px-8">

        <div className="absolute inset-0 z-0 overflow-hidden">
          <BlurredCircle size="xl" color="bg-lime/10" top="-5%" left="-10%" />
          <BlurredCircle size="lg" color="bg-orange-500/20" bottom="-10%" right="-5%" delay={700} />
          <BlurredCircle size="md" color="bg-red-500/10" top="30%" right="10%" delay={300} />
        </div>
        
        <div className={`relative z-10 w-full max-w-5xl mx-auto py-16 flex flex-col items-center 
                      transition-opacity duration-500`}>
          
          <div className="mb-12">
            <Logo />
          </div>
          
          {/* Main heading */}
          <h1 className="opacity-0 animate-slide-down animation-delay-300 text-4xl sm:text-5xl md:text-6xl font-bold text-center leading-tight tracking-tight mb-6">
            <span className="block">Talk to your video editor</span>
            <span className="text-gradient">Render in your browser</span>
          </h1>
          
          <p className="opacity-0 animate-fade-in animation-delay-500 text-xl text-center text-muted-foreground max-w-4xl mb-10">
            Create stunning, professional-quality videos in minutes with our intuitive AI editor. 
            No technical skills required - Unless you want to edit manually ¯\_(ツ)_/¯
          </p>
          
          <AnimatedButton delay={800} className="mt-4">
            Launch YOYOLOO Studio
          </AnimatedButton>
          
          {/* Footer note */}
          <p className="opacity-0 animate-fade-in animation-delay-1000 mt-16 text-sm text-muted-foreground">
            Experience the future of video editing today
          </p>
        </div>
      </div>
    )
}