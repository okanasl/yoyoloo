'use client';

import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { z } from 'zod'
import { toast } from 'sonner';
import { signup } from './actions';
import { AnimatedClapperboard } from '@/components/ui/clapperboard-loading';
import { Separator } from '@/components/ui/separator';
import { AuthenticationForm } from '@/components/auth/auth-form';

export const signUpFormSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email.' }).toLowerCase().trim(),
  password: z
    .string()
    .min(8, { message: 'Be at least 8 characters long' })
    .regex(/[a-zA-Z]/, { message: 'Contain at least one letter.' })
    .regex(/[0-9]/, { message: 'Contain at least one number.' })
    .regex(/[^a-zA-Z0-9]/, {
      message: 'Contain at least one special character.',
    }),
})

export type SignUpFormSchema = z.infer<typeof signUpFormSchema>

export function SignupForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function handleSignup() {
    signup({ email, password }).then((data) => {
      if (data?.error) {
        toast("Something went wrong. Please try again");
      }
    });
  }

  return (
    <form action={'#'} className={'px-6 md:px-16 pb-6 py-8 gap-6 flex flex-col items-center justify-center'}>
      <AnimatedClapperboard className='w-8 h-8' />
      <div className={'text-[30px] leading-[36px] font-medium tracking-[-0.6px] text-center'}>Create an account</div>
        <div className={'flex w-full items-center justify-center'}>
          <Separator className={'w-5/12 bg-border'} />
          <div className={'text-border text-xs font-medium px-4'}></div>
          <Separator className={'w-5/12 bg-border'} />
        </div>
      <AuthenticationForm
        email={email}
        onEmailChange={(email) => setEmail(email)}
        password={password}
        onPasswordChange={(password) => setPassword(password)}
      />
      <Button formAction={() => handleSignup()} type={'submit'} className={'w-full'}>
        Sign up
      </Button>
    </form>
  );
}
