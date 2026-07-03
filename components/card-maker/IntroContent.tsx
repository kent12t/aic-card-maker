"use client";

type IntroContentProps = {
  titleClassName: string;
  textClassName: string;
};

export function IntroContent({ titleClassName, textClassName }: IntroContentProps) {
  return (
    <div className="space-y-2">
      <h1 className={titleClassName}>Customise Your C.A.R.E. Card</h1>
      <p className={textClassName}>
        Create a message of thanks with the text editor below and decorate your card with the stickers provided. You may also choose to upload
        your own picture.
      </p>
      <p className={textClassName}>
        Once you&apos;re done, click submit and watch your card become a part of a beautiful photo mosaic celebrating Community Care
        Professionals on Community Care Day.
      </p>
    </div>
  );
}
