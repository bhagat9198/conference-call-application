import React from 'react';
import { SvgIcon } from '../../SvgIcon';
import { Tooltip } from '@mui/material';
import { useTranslation } from 'react-i18next';
import { CustomizedBtn } from "../../CustomizedBtn";

export const roundStyle = {
  width: { xs: 36, md: 46 },
  height: { xs: 36, md: 46 },
  minWidth: 'unset',
  maxWidth: { xs: 36, md: 46 },
  maxHeight: { xs: 36, md: 46 },
  borderRadius: '50%',
  padding: '4px',
};

function DrawButton(props) {
  const { rounded, footer, drawingBoard, setDrawingBoard } = props;
  const { t } = useTranslation();

  return (
    <>
      <Tooltip title={t('Darwing')} placement="top">
        <CustomizedBtn className={footer ? 'footer-icon-button' : ''} variant="contained" color={drawingBoard ? 'primary' : 'secondary'} sx={rounded ? roundStyle : {}} onClick={(e) => { setDrawingBoard(!drawingBoard) }}>
          <SvgIcon size={40} name={'draw'} color={drawingBoard ? "#000" : "#fff"} />
        </CustomizedBtn>
      </Tooltip>
    </>
  );
}

export default DrawButton;
