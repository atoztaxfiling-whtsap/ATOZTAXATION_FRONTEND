const EMOJIS = ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','😊','😇','👍','🙌','👌','😘','😗','😚','😙','🥲','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','😌','😔','😪','😴','😷','🤒','🤕','🤧','🥵','🥶','🥴','😵','🤯','🤠','🥳','😎','🤓','🧐','😕','😟','🙁','😮','😯','😲','😳','🥺','😨','😰','😥','😢','😭','😱','😖','😣','😞','😩','😫','😤','😡','😠','👍','👎','👏','🙌','🤝','🙏','❤️','🔥','⭐','✅'];

export default function EmojiPicker({ onSelect, onClose }: { onSelect: (e: string) => void; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute bottom-full left-0 mb-2 p-3 rounded-xl shadow-xl z-50" style={{ background: '#fff', border: '1px solid #E6E7E2', width: '288px' }}>
        <div className="grid grid-cols-10 gap-0.5">
          {EMOJIS.map((e, i) => (
            <button key={i} onClick={() => { onSelect(e); onClose(); }} className="text-xl p-1 rounded hover:bg-gray-100 transition leading-none">{e}</button>
          ))}
        </div>
      </div>
    </>
  );
}
